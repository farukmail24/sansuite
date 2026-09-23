import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import AppLayout from "../../components/layout/AppLayout";
import { apiRequest, queryClient } from "../../lib/queryClient";
import { useToast } from "../../hooks/useToast";
import { Save, Plus, X, Building, Settings2, Trash2, Calendar, DollarSign, CheckCircle2, AlertTriangle, ArrowRight } from "lucide-react";
import { bookkeepingSidebar, getClientSidebar } from "./sidebar";
import ClientGuard from "./ClientGuard";

export default function FixedAssetsPage() {
  const [match, params] = useRoute("/bookkeeping/:id/fixed-assets");
  const clientId = match ? params.id : "";
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const [showAddModal, setShowAddModal] = useState(false);
  const [showDepModal, setShowDepModal] = useState(false);
  const [depreciationDate, setDepreciationDate] = useState(new Date().toISOString().split("T")[0]);

  // Disposal Modal State
  const [disposingAsset, setDisposingAsset] = useState<any>(null);
  const [disposalDate, setDisposalDate] = useState(new Date().toISOString().split("T")[0]);
  const [disposalProceeds, setDisposalProceeds] = useState("0.00");

  const [formData, setFormData] = useState({
    name: "",
    assetCode: "",
    type: "Computer Equipment",
    purchaseDate: new Date().toISOString().split("T")[0],
    cost: "",
    depreciationMethod: "Straight Line",
    rate: "20"
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["/api/practice/clients"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/practice/clients");
      return res.json();
    },
  });
  const client = clients.find((c: any) => String(c.id) === clientId);

  const { data: assets = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/bookkeeping/fixed-assets", clientId],
    queryFn: async () => {
      if (!clientId) return [];
      const res = await apiRequest("GET", `/api/bookkeeping/fixed-assets/client/${clientId}`);
      return res.json();
    },
    enabled: !!clientId
  });

  const createAssetMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiRequest("POST", "/api/bookkeeping/fixed-assets", payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookkeeping/fixed-assets", clientId] });
      setShowAddModal(false);
      setFormData({
        name: "",
        assetCode: "",
        type: "Computer Equipment",
        purchaseDate: new Date().toISOString().split("T")[0],
        cost: "",
        depreciationMethod: "Straight Line",
        rate: "20"
      });
      toast({ title: "Asset Registered", description: "Fixed asset successfully added to the asset register." });
    },
    onError: (err: any) => {
      toast({ title: "Registration Failed", description: err.message || "Failed to register fixed asset", type: "error" });
    }
  });

  const runDepreciationMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/bookkeeping/fixed-assets/${clientId}/run-depreciation`, {
        depreciationDate,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to execute depreciation run");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookkeeping/fixed-assets", clientId] });
      setShowDepModal(false);
      toast({ 
        title: "Depreciation Complete", 
        description: data.message || `Posted depreciation charge of £${data.totalDepCharge} to General Ledger.` 
      });
    },
    onError: (err: any) => {
      toast({ title: "Depreciation Failed", description: err.message, type: "error" });
    }
  });

  const disposeMutation = useMutation({
    mutationFn: async () => {
      if (!disposingAsset) return;
      const res = await apiRequest("POST", `/api/bookkeeping/fixed-assets/${disposingAsset.id}/dispose`, {
        disposalDate,
        disposalProceeds,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to record disposal");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookkeeping/fixed-assets", clientId] });
      setDisposingAsset(null);
      toast({ 
        title: "Asset Disposed", 
        description: data.message || "Asset marked as disposed and gain/loss posted to journal." 
      });
    },
    onError: (err: any) => {
      toast({ title: "Disposal Failed", description: err.message, type: "error" });
    }
  });

  const deleteAssetMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/bookkeeping/fixed-assets/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookkeeping/fixed-assets", clientId] });
      toast({ title: "Asset Removed", description: "The fixed asset has been deleted." });
    },
    onError: (err: any) => {
      toast({ title: "Deletion Failed", description: err.message || "Failed to delete fixed asset", type: "error" });
    }
  });

  const saveAsset = () => {
    if (!formData.name || !formData.cost) {
      toast({ title: "Error", description: "Please fill in all required fields", type: "error" });
      return;
    }
    createAssetMutation.mutate({
      clientId: Number(clientId),
      assetName: formData.name,
      assetCode: formData.assetCode || `FA-${Date.now().toString().slice(-4)}`,
      assetType: formData.type,
      purchaseDate: formData.purchaseDate,
      originalCost: formData.cost,
      depreciationMethod: formData.depreciationMethod,
      depreciationRate: formData.rate,
      accumulatedDepreciation: "0.00",
      netBookValue: formData.cost,
      status: "Active"
    });
  };

  if (!clientId) {
    return <ClientGuard featureTitle="Fixed Assets" />;
  }

  const activeAssets = assets.filter(a => a.status !== "Disposed" && a.status !== "Written Off");
  const totalCost = assets.reduce((sum, a) => sum + Number(a.originalCost || 0), 0);
  const totalNbv = assets.reduce((sum, a) => sum + Number(a.netBookValue || 0), 0);
  const totalAccumDep = assets.reduce((sum, a) => sum + Number(a.accumulatedDepreciation || 0), 0);

  // Disposal live preview
  const proceedsNum = parseFloat(disposalProceeds || "0");
  const disposingNbv = disposingAsset ? parseFloat(disposingAsset.netBookValue || "0") : 0;
  const gainOrLoss = proceedsNum - disposingNbv;

  return (
    <AppLayout sidebar={clientId ? getClientSidebar(clientId) : bookkeepingSidebar} module="Bookkeeping">
      <div className="bg-gray-50 min-h-screen">
        <div className="bg-white px-6 py-2.5 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center text-sm text-gray-500 gap-2">
            <button onClick={() => navigate("/bookkeeping")} className="hover:text-purple-600">Bookkeeping</button>
            <span>/</span>
            <span className="font-medium text-gray-800">{client?.clientName || "Client"}</span>
            <span>/</span>
            <span className="text-gray-800 font-semibold">Fixed Assets Register</span>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setShowDepModal(true)} 
              disabled={activeAssets.length === 0}
              className="bg-white border border-gray-300 text-gray-700 px-3.5 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5 hover:bg-gray-50 shadow-sm disabled:opacity-50"
            >
              <Settings2 size={14} /> Run Periodic Depreciation
            </button>
            <button 
              onClick={() => setShowAddModal(true)} 
              className="btn-SanSuite flex items-center gap-1.5"
            >
              <Plus size={14} /> + Add Asset
            </button>
          </div>
        </div>

        <div className="p-6 max-w-6xl mx-auto space-y-6">
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
              <span className="text-xs font-semibold text-gray-500 uppercase">Registered Assets</span>
              <p className="text-2xl font-bold text-gray-800 mt-1">{assets.length} ({activeAssets.length} Active)</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
              <span className="text-xs font-semibold text-gray-500 uppercase">Total Original Cost</span>
              <p className="text-2xl font-bold font-mono text-gray-800 mt-1">£{totalCost.toFixed(2)}</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
              <span className="text-xs font-semibold text-gray-500 uppercase">Accumulated Depreciation</span>
              <p className="text-2xl font-bold font-mono text-red-600 mt-1">£{totalAccumDep.toFixed(2)}</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
              <span className="text-xs font-semibold text-gray-500 uppercase">Total Net Book Value</span>
              <p className="text-2xl font-bold font-mono text-purple-700 mt-1">£{totalNbv.toFixed(2)}</p>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-purple-100 text-purple-700 rounded-lg flex items-center justify-center">
                  <Building size={16} />
                </div>
                <div>
                  <h2 className="font-semibold text-gray-800">Fixed Assets Schedule</h2>
                  <p className="text-xs text-gray-500">Track capital expenditures, depreciation charge, and disposal journals.</p>
                </div>
              </div>
            </div>
            
            {isLoading ? (
              <div className="p-10 text-center text-sm text-gray-500">Loading asset register...</div>
            ) : assets.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Building size={24} />
                </div>
                <h3 className="text-base font-semibold text-gray-800 mb-1">No Fixed Assets Registered</h3>
                <p className="text-sm text-gray-500 max-w-md mx-auto mb-5">
                  Record company capital purchases such as computer equipment, vehicles, and plant machinery to maintain a statutory register.
                </p>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="btn-SanSuite inline-flex items-center gap-1.5"
                >
                  <Plus size={16} /> Register First Asset
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 text-xs font-semibold text-gray-500 border-b border-gray-200 uppercase">
                      <th className="px-5 py-3">Code</th>
                      <th className="px-5 py-3">Asset Name</th>
                      <th className="px-5 py-3">Type</th>
                      <th className="px-5 py-3">Purchase Date</th>
                      <th className="px-5 py-3 text-right">Cost (£)</th>
                      <th className="px-5 py-3 text-right">Accum. Dep (£)</th>
                      <th className="px-5 py-3 text-right">NBV (£)</th>
                      <th className="px-5 py-3">Method & Rate</th>
                      <th className="px-5 py-3">Status</th>
                      <th className="px-5 py-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm divide-y divide-gray-100">
                    {assets.map((a: any) => {
                      const isDisposed = a.status === "Disposed";
                      return (
                        <tr key={a.id} className="hover:bg-gray-50/50">
                          <td className="px-5 py-3 font-mono text-xs font-semibold text-gray-500">{a.assetCode || `FA-${a.id}`}</td>
                          <td className="px-5 py-3 font-medium text-purple-700">{a.assetName}</td>
                          <td className="px-5 py-3 text-xs text-gray-600">{a.assetType}</td>
                          <td className="px-5 py-3 text-xs text-gray-600">
                            {a.purchaseDate ? new Date(a.purchaseDate).toLocaleDateString("en-GB") : "—"}
                          </td>
                          <td className="px-5 py-3 text-right font-mono text-xs text-gray-800">
                            £{parseFloat(a.originalCost || 0).toFixed(2)}
                          </td>
                          <td className="px-5 py-3 text-right font-mono text-xs text-red-600">
                            £{parseFloat(a.accumulatedDepreciation || 0).toFixed(2)}
                          </td>
                          <td className="px-5 py-3 text-right font-mono text-xs font-bold text-gray-900">
                            £{parseFloat(a.netBookValue || 0).toFixed(2)}
                          </td>
                          <td className="px-5 py-3 text-xs text-gray-600">
                            {a.depreciationMethod} ({a.depreciationRate}%)
                          </td>
                          <td className="px-5 py-3">
                            <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${
                              isDisposed ? "bg-gray-100 text-gray-600" : "bg-emerald-50 text-emerald-700"
                            }`}>
                              {a.status || "Active"}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {!isDisposed && (
                                <button
                                  onClick={() => {
                                    setDisposingAsset(a);
                                    setDisposalProceeds("0.00");
                                  }}
                                  className="px-2 py-1 text-xs border border-amber-200 text-amber-700 hover:bg-amber-50 rounded font-medium"
                                  title="Dispose Asset"
                                >
                                  Dispose
                                </button>
                              )}
                              <button
                                onClick={() => {
                                  if (confirm(`Are you sure you want to delete "${a.assetName}"?`)) {
                                    deleteAssetMutation.mutate(a.id);
                                  }
                                }}
                                className="text-gray-400 hover:text-red-600 p-1 rounded hover:bg-gray-100"
                                title="Delete Asset"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Asset Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b bg-gray-50 flex justify-between items-center">
              <h3 className="font-semibold text-gray-800">Register New Fixed Asset</h3>
              <button onClick={() => setShowAddModal(false)}><X size={20} className="text-gray-400" /></button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Asset Code</label>
                  <input 
                    type="text" 
                    value={formData.assetCode} 
                    onChange={(e) => setFormData({ ...formData, assetCode: e.target.value })} 
                    placeholder="e.g. FA-001" 
                    className="w-full px-3 py-2 border rounded-lg text-sm font-mono focus:ring-2 focus:ring-purple-500" 
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Asset Type</label>
                  <select 
                    value={formData.type} 
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })} 
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="Computer Equipment">Computer Equipment</option>
                    <option value="Office Equipment">Office Equipment</option>
                    <option value="Fixtures & Fittings">Fixtures & Fittings</option>
                    <option value="Motor Vehicles">Motor Vehicles</option>
                    <option value="Plant & Machinery">Plant & Machinery</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Asset Name *</label>
                <input 
                  type="text" 
                  value={formData.name} 
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
                  placeholder="e.g. MacBook Pro M3 Max" 
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-purple-500" 
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Purchase Date *</label>
                  <input 
                    type="date" 
                    value={formData.purchaseDate} 
                    onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })} 
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-purple-500" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Original Acquisition Cost (£) *</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    placeholder="0.00" 
                    value={formData.cost} 
                    onChange={(e) => setFormData({ ...formData, cost: e.target.value })} 
                    className="w-full px-3 py-2 border rounded-lg text-sm font-mono font-bold focus:ring-2 focus:ring-purple-500" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Depreciation Method</label>
                  <select 
                    value={formData.depreciationMethod} 
                    onChange={(e) => setFormData({ ...formData, depreciationMethod: e.target.value })} 
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="Straight Line">Straight Line</option>
                    <option value="Reducing Balance">Reducing Balance</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Annual Rate (%)</label>
                  <input 
                    type="number" 
                    value={formData.rate} 
                    onChange={(e) => setFormData({ ...formData, rate: e.target.value })} 
                    className="w-full px-3 py-2 border rounded-lg text-sm font-mono focus:ring-2 focus:ring-purple-500" 
                  />
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-3">
              <button onClick={() => setShowAddModal(false)} className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-100">Cancel</button>
              <button 
                onClick={saveAsset} 
                disabled={createAssetMutation.isPending} 
                className="btn-SanSuite flex items-center gap-1.5 disabled:opacity-50"
              >
                <Save size={14} /> {createAssetMutation.isPending ? "Saving..." : "Save Asset"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Run Depreciation Modal */}
      {showDepModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b bg-gray-50 flex justify-between items-center">
              <div>
                <h3 className="font-semibold text-gray-800">Execute Periodic Depreciation</h3>
                <p className="text-xs text-gray-500">Calculates statutory depreciation and posts general ledger journal</p>
              </div>
              <button onClick={() => setShowDepModal(false)}><X size={20} className="text-gray-400" /></button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Depreciation Date *</label>
                <input 
                  type="date" 
                  value={depreciationDate} 
                  onChange={(e) => setDepreciationDate(e.target.value)} 
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-purple-500" 
                />
              </div>

              <div className="p-4 bg-purple-50 border border-purple-100 rounded-lg space-y-2 text-xs">
                <p className="font-semibold text-purple-900">Automatic Double-Entry Journal Postings:</p>
                <div className="flex justify-between text-gray-700">
                  <span>Dr 7000 Depreciation Charge (Expense)</span>
                  <span className="font-mono font-bold">Auto-calculated</span>
                </div>
                <div className="flex justify-between text-gray-700">
                  <span>Cr 0021 Accumulated Depreciation (Balance Sheet)</span>
                  <span className="font-mono font-bold">Auto-calculated</span>
                </div>
              </div>

              <div className="border rounded-lg p-3 bg-gray-50 text-xs space-y-1">
                <div className="flex justify-between font-medium text-gray-700">
                  <span>Active Assets to Process:</span>
                  <span className="font-bold">{activeAssets.length}</span>
                </div>
                <div className="flex justify-between font-medium text-gray-700">
                  <span>Current Total Net Book Value:</span>
                  <span className="font-bold font-mono">£{totalNbv.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-3">
              <button onClick={() => setShowDepModal(false)} className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-100">Cancel</button>
              <button 
                onClick={() => runDepreciationMutation.mutate()} 
                disabled={runDepreciationMutation.isPending || activeAssets.length === 0} 
                className="btn-SanSuite flex items-center gap-1.5 disabled:opacity-50"
              >
                <CheckCircle2 size={14} />
                {runDepreciationMutation.isPending ? "Calculating & Posting..." : "Run & Post Depreciation"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dispose Asset Modal */}
      {disposingAsset && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b bg-gray-50 flex justify-between items-center">
              <div>
                <h3 className="font-semibold text-gray-800">Dispose Asset</h3>
                <p className="text-xs text-gray-500">{disposingAsset.assetName} ({disposingAsset.assetCode || `FA-${disposingAsset.id}`})</p>
              </div>
              <button onClick={() => setDisposingAsset(null)}><X size={20} className="text-gray-400" /></button>
            </div>
            
            <div className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Disposal Date *</label>
                <input 
                  type="date" 
                  value={disposalDate} 
                  onChange={(e) => setDisposalDate(e.target.value)} 
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-purple-500" 
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Disposal Sale Proceeds (£)</label>
                <input 
                  type="number" 
                  step="0.01" 
                  value={disposalProceeds} 
                  onChange={(e) => setDisposalProceeds(e.target.value)} 
                  className="w-full px-3 py-2 border rounded-lg text-sm font-mono font-bold focus:ring-2 focus:ring-purple-500" 
                />
                <span className="text-[11px] text-gray-400 mt-0.5 block">Enter 0.00 if scrapped or written off with no proceeds.</span>
              </div>

              <div className="p-4 bg-gray-50 border rounded-lg space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-gray-500">Asset Current NBV:</span>
                  <span className="font-mono font-bold">£{disposingNbv.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Sale Proceeds:</span>
                  <span className="font-mono font-bold">£{proceedsNum.toFixed(2)}</span>
                </div>
                <div className="flex justify-between pt-1 border-t font-semibold">
                  <span className={gainOrLoss >= 0 ? "text-emerald-700" : "text-red-700"}>
                    {gainOrLoss >= 0 ? "Profit on Disposal:" : "Loss on Disposal:"}
                  </span>
                  <span className={`font-mono ${gainOrLoss >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                    £{Math.abs(gainOrLoss).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-3">
              <button onClick={() => setDisposingAsset(null)} className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-100">Cancel</button>
              <button 
                onClick={() => disposeMutation.mutate()} 
                disabled={disposeMutation.isPending} 
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 flex items-center gap-1.5"
              >
                <CheckCircle2 size={14} />
                {disposeMutation.isPending ? "Disposing..." : "Confirm Disposal"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
