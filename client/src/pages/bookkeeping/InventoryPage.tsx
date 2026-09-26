import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AppLayout from "../../components/layout/AppLayout";
import { apiRequest } from "../../lib/queryClient";
import { useToast } from "../../hooks/useToast";
import { 
  Save, Plus, X, PackageOpen, ArrowDownUp, BookOpen, 
  Layers, CheckCircle2, History, AlertTriangle, FileText 
} from "lucide-react";
import { bookkeepingSidebar, getClientSidebar } from "./sidebar";
import ClientGuard from "./ClientGuard";

export default function InventoryPage() {
  const [match, params] = useRoute("/bookkeeping/:id/inventory");
  const clientId = match ? params?.id : "";
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [activeTab, setActiveTab] = useState<"items" | "adjustments">("items");
  const [showItemModal, setShowItemModal] = useState(false);
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);

  // Form State for Adding Item
  const [itemForm, setItemForm] = useState({
    name: "",
    itemCode: "",
    description: "",
    purchasePrice: "0.00",
    salesPrice: "0.00",
    openingBalanceQuantity: "0",
    reorderLevel: "10",
  });

  // Form State for Stock Adjustment (Capium Parity Article 9000204640)
  const [adjForm, setAdjForm] = useState({
    adjustmentDate: new Date().toISOString().split("T")[0],
    valuationBasis: "Lower of Cost and Net Realisable Value",
    closingStockValue: "",
    openingStockValue: "",
    description: "Period-end closing stock valuation adjustment",
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["/api/practice/clients"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/practice/clients");
      return res.ok ? res.json() : [];
    },
  });
  const client = clients.find((c: any) => String(c.id) === clientId);

  // Query real client items
  const { data: items = [], isLoading: loadingItems } = useQuery({
    queryKey: [`/api/bookkeeping/items/client/${clientId}`],
    queryFn: async () => {
      if (!clientId) return [];
      const res = await apiRequest("GET", `/api/bookkeeping/items/client/${clientId}`);
      return res.ok ? res.json() : [];
    },
    enabled: !!clientId,
  });

  // Query real stock adjustment journals
  const { data: adjustments = [], isLoading: loadingAdjustments } = useQuery({
    queryKey: [`/api/bookkeeping/stock-adjustments/client/${clientId}`],
    queryFn: async () => {
      if (!clientId) return [];
      const res = await apiRequest("GET", `/api/bookkeeping/stock-adjustments/client/${clientId}`);
      return res.ok ? res.json() : [];
    },
    enabled: !!clientId,
  });

  const products = items.filter((i: any) => i.type === "Product" || !i.type);

  const totalQuantity = products.reduce((sum: number, item: any) => {
    return sum + (parseFloat(item.openingBalanceQuantity || "0"));
  }, 0);

  const totalValue = products.reduce((sum: number, item: any) => {
    const qty = parseFloat(item.openingBalanceQuantity || "0");
    const cost = parseFloat(item.purchasePrice || "0");
    return sum + (qty * cost);
  }, 0);

  // Save new Stock Item Mutation
  const saveItemMutation = useMutation({
    mutationFn: async () => {
      if (!itemForm.name.trim()) throw new Error("Product name is required");
      const res = await apiRequest("POST", "/api/bookkeeping/items", {
        clientId: parseInt(clientId),
        name: itemForm.name.trim(),
        itemCode: itemForm.itemCode.trim() || `SKU-${Date.now().toString().slice(-4)}`,
        description: itemForm.description.trim(),
        type: "Product",
        purchasePrice: parseFloat(itemForm.purchasePrice || "0").toFixed(2),
        salesPrice: parseFloat(itemForm.salesPrice || "0").toFixed(2),
        openingBalanceQuantity: parseFloat(itemForm.openingBalanceQuantity || "0").toFixed(2),
        salesVatRate: "20.00",
        purchaseVatRate: "20.00",
        salesNominalCode: "4000",
        purchaseNominalCode: "5000",
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Stock Item Created", description: "Item saved to inventory catalog." });
      qc.invalidateQueries({ queryKey: [`/api/bookkeeping/items/client/${clientId}`] });
      setShowItemModal(false);
      setItemForm({
        name: "",
        itemCode: "",
        description: "",
        purchasePrice: "0.00",
        salesPrice: "0.00",
        openingBalanceQuantity: "0",
        reorderLevel: "10",
      });
    },
    onError: (err: any) => toast({ title: "Failed to Add Item", description: err.message, variant: "destructive" }),
  });

  // Post Stock Adjustment Journal Mutation
  const postAdjustmentMutation = useMutation({
    mutationFn: async () => {
      const closeVal = parseFloat(adjForm.closingStockValue || "0");
      const openVal = parseFloat(adjForm.openingStockValue || "0");
      if (closeVal <= 0 && openVal <= 0) {
        throw new Error("Please specify a closing stock or opening stock valuation amount.");
      }
      const res = await apiRequest("POST", "/api/bookkeeping/stock-adjustment", {
        clientId: parseInt(clientId),
        adjustmentDate: adjForm.adjustmentDate,
        valuationBasis: adjForm.valuationBasis,
        closingStockValue: closeVal.toFixed(2),
        openingStockValue: openVal.toFixed(2),
        description: adjForm.description,
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: (data: any) => {
      toast({ 
        title: "Stock Adjustment Journal Posted", 
        description: data.message || `Journal ${data.journalNumber} created in ledger.` 
      });
      qc.invalidateQueries({ queryKey: [`/api/bookkeeping/stock-adjustments/client/${clientId}`] });
      qc.invalidateQueries({ queryKey: [`/api/bookkeeping/client/${clientId}/dashboard-analytics`] });
      setShowAdjustmentModal(false);
      setAdjForm({
        adjustmentDate: new Date().toISOString().split("T")[0],
        valuationBasis: "Lower of Cost and Net Realisable Value",
        closingStockValue: "",
        openingStockValue: "",
        description: "Period-end closing stock valuation adjustment",
      });
    },
    onError: (err: any) => toast({ title: "Adjustment Failed", description: err.message, variant: "destructive" }),
  });

  if (!clientId) {
    return <ClientGuard featureTitle="Inventory" />;
  }

  return (
    <AppLayout sidebar={clientId ? getClientSidebar(clientId) : bookkeepingSidebar} module="Bookkeeping">
      <div className="bg-gray-50 min-h-screen pb-12">
        {/* Top Header Bar */}
        <div className="bg-white px-5 py-3 border-b border-gray-200 flex items-center justify-between shadow-xs">
          <div className="flex items-center text-sm text-gray-500 gap-2">
            <button onClick={() => navigate("/bookkeeping")} className="hover:text-purple-600 transition-colors">Bookkeeping</button>
            <span>/</span>
            <button onClick={() => navigate(`/bookkeeping/${clientId}`)} className="hover:text-purple-600 transition-colors font-medium text-gray-700">
              {client?.clientName || "Client"}
            </button>
            <span>/</span>
            <span className="text-gray-900 font-semibold">Inventory & Stock Valuation</span>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowAdjustmentModal(true)} 
              className="bg-white border border-purple-200 text-purple-700 hover:bg-purple-50 px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <ArrowDownUp size={14} /> Record Period Stock Adjustment
            </button>
            <button 
              onClick={() => setShowItemModal(true)} 
              className="btn-SanSuite flex items-center gap-1.5 text-xs font-semibold px-3.5 py-1.5 shadow-xs"
            >
              <Plus size={14} /> Add Stock Item
            </button>
          </div>
        </div>

        <div className="p-6 max-w-6xl mx-auto space-y-6">
          {/* Top Metric Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="SanSuite-card p-5 border-l-4 border-l-purple-600">
              <p className="text-xs font-semibold text-gray-500 uppercase">Tracked Products</p>
              <p className="text-2xl font-bold mt-1 text-gray-800">{products.length}</p>
              <p className="text-xs text-gray-400 mt-1">Total physical stock items tracked</p>
            </div>
            <div className="SanSuite-card p-5 border-l-4 border-l-emerald-600">
              <p className="text-xs font-semibold text-gray-500 uppercase">Total Catalog Value</p>
              <p className="text-2xl font-bold mt-1 text-emerald-700">£{totalValue.toLocaleString("en-GB", { minimumFractionDigits: 2 })}</p>
              <p className="text-xs text-gray-400 mt-1">Valuation based on purchase cost</p>
            </div>
            <div className="SanSuite-card p-5 border-l-4 border-l-indigo-600">
              <p className="text-xs font-semibold text-gray-500 uppercase">Stock Adjustments Posted</p>
              <p className="text-2xl font-bold mt-1 text-indigo-700">{adjustments.length}</p>
              <p className="text-xs text-gray-400 mt-1">Period-end double-entry journals</p>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex border-b border-gray-200 gap-6">
            <button
              onClick={() => setActiveTab("items")}
              className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
                activeTab === "items" 
                  ? "border-purple-600 text-purple-700" 
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <PackageOpen size={16} /> Stock Items Catalog ({products.length})
            </button>
            <button
              onClick={() => setActiveTab("adjustments")}
              className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
                activeTab === "adjustments" 
                  ? "border-purple-600 text-purple-700" 
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <History size={16} /> Period-End Stock Journals ({adjustments.length})
            </button>
          </div>

          {/* TAB 1: Stock Items Table */}
          {activeTab === "items" && (
            <div className="SanSuite-card overflow-hidden">
              <div className="px-5 py-4 border-b bg-gray-50/70 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-sm text-gray-800">Physical Stock Inventory</h3>
                  <p className="text-xs text-gray-400">Track quantities on hand and unit purchase costs</p>
                </div>
              </div>
              <table className="SanSuite-table">
                <thead>
                  <tr>
                    <th>Item Code / SKU</th>
                    <th>Product Name</th>
                    <th>Description</th>
                    <th className="text-right">Qty on Hand</th>
                    <th className="text-right">Unit Cost</th>
                    <th className="text-right">Sales Price</th>
                    <th className="text-right">Total Cost Value</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingItems ? (
                    <tr><td colSpan={7} className="text-center py-10 text-gray-400">Loading stock items...</td></tr>
                  ) : products.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12">
                        <div className="max-w-sm mx-auto space-y-3">
                          <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center mx-auto">
                            <PackageOpen size={24} />
                          </div>
                          <p className="text-sm font-semibold text-gray-700">No Stock Items Recorded</p>
                          <p className="text-xs text-gray-400">Add physical inventory products to monitor stock levels and automate cost-of-sales adjustments.</p>
                          <button onClick={() => setShowItemModal(true)} className="btn-SanSuite text-xs">
                            <Plus size={13} className="inline mr-1" /> Add First Stock Item
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : products.map((item: any) => {
                    const qty = parseFloat(item.openingBalanceQuantity || "0");
                    const cost = parseFloat(item.purchasePrice || "0");
                    const itemTotal = qty * cost;
                    return (
                      <tr key={item.id} className="hover:bg-purple-50/20">
                        <td className="font-mono text-xs text-purple-700 font-semibold">{item.itemCode || "—"}</td>
                        <td className="font-medium text-gray-800">{item.name}</td>
                        <td className="text-xs text-gray-500">{item.description || "—"}</td>
                        <td className="text-right font-medium text-gray-800">{qty}</td>
                        <td className="text-right font-mono text-xs text-gray-600">£{cost.toFixed(2)}</td>
                        <td className="text-right font-mono text-xs text-gray-800">£{parseFloat(item.salesPrice || "0").toFixed(2)}</td>
                        <td className="text-right font-mono text-xs font-bold text-emerald-700">£{itemTotal.toFixed(2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 2: Period-End Stock Adjustment Journals */}
          {activeTab === "adjustments" && (
            <div className="SanSuite-card overflow-hidden">
              <div className="px-5 py-4 border-b bg-gray-50/70 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-sm text-gray-800">Stock Valuation & Cost of Sales Postings</h3>
                  <p className="text-xs text-gray-400">Double-entry journals adjusting Closing Stock (Asset 1001) and Cost of Sales (5200 / 5201)</p>
                </div>
              </div>
              <table className="SanSuite-table">
                <thead>
                  <tr>
                    <th>Journal #</th>
                    <th>Adjustment Date</th>
                    <th>Valuation Basis / Reference</th>
                    <th>Description / Narration</th>
                    <th className="text-right">Journal Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingAdjustments ? (
                    <tr><td colSpan={6} className="text-center py-10 text-gray-400">Loading adjustment journals...</td></tr>
                  ) : adjustments.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-12">
                        <div className="max-w-sm mx-auto space-y-3">
                          <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto">
                            <ArrowDownUp size={24} />
                          </div>
                          <p className="text-sm font-semibold text-gray-700">No Stock Adjustments Recorded</p>
                          <p className="text-xs text-gray-400">Record period-end closing stock count to automatically generate statutory double-entry Cost of Sales journals.</p>
                          <button onClick={() => setShowAdjustmentModal(true)} className="btn-SanSuite text-xs">
                            <ArrowDownUp size={13} className="inline mr-1" /> Record Stock Adjustment
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : adjustments.map((adj: any) => (
                    <tr key={adj.id} className="hover:bg-purple-50/20">
                      <td className="font-mono text-xs text-purple-700 font-semibold">{adj.journalNumber || `JRN-${adj.id}`}</td>
                      <td className="font-medium text-gray-800">{adj.journalDate ? new Date(adj.journalDate).toLocaleDateString("en-GB") : "—"}</td>
                      <td className="text-xs font-semibold text-indigo-700">{adj.reference || "Stock Valuation"}</td>
                      <td className="text-xs text-gray-600">{adj.description || "—"}</td>
                      <td className="text-right font-mono text-xs font-bold text-gray-800">
                        £{parseFloat(adj.totalAmount || "0").toFixed(2)}
                      </td>
                      <td>
                        <span className="badge-success">Posted to Ledger</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* MODAL 1: Add Stock Item */}
      {showItemModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b bg-gray-50 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-gray-800">Add Stock Item</h3>
                <p className="text-xs text-gray-400">Create a tracked product in the inventory catalog</p>
              </div>
              <button onClick={() => setShowItemModal(false)}><X size={18} className="text-gray-400 hover:text-gray-600" /></button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Product Name *</label>
                <input 
                  type="text" 
                  value={itemForm.name} 
                  onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })} 
                  placeholder="e.g. Standard Brass Fitting"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none" 
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Item Code / SKU</label>
                <input 
                  type="text" 
                  value={itemForm.itemCode} 
                  onChange={(e) => setItemForm({ ...itemForm, itemCode: e.target.value })} 
                  placeholder="e.g. FIT-001"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none" 
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Quantity on Hand</label>
                  <input 
                    type="number" 
                    value={itemForm.openingBalanceQuantity} 
                    onChange={(e) => setItemForm({ ...itemForm, openingBalanceQuantity: e.target.value })} 
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Unit Cost (£)</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    value={itemForm.purchasePrice} 
                    onChange={(e) => setItemForm({ ...itemForm, purchasePrice: e.target.value })} 
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none" 
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Sales Selling Price (£)</label>
                <input 
                  type="number" 
                  step="0.01" 
                  value={itemForm.salesPrice} 
                  onChange={(e) => setItemForm({ ...itemForm, salesPrice: e.target.value })} 
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none" 
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Description</label>
                <textarea 
                  rows={2}
                  value={itemForm.description} 
                  onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })} 
                  placeholder="Product specifications..."
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none" 
                />
              </div>
            </div>

            <div className="px-6 py-3 border-t bg-gray-50 flex justify-end gap-2">
              <button onClick={() => setShowItemModal(false)} className="px-4 py-2 text-xs border rounded-lg hover:bg-gray-100 font-medium">Cancel</button>
              <button 
                onClick={() => saveItemMutation.mutate()} 
                disabled={saveItemMutation.isPending}
                className="btn-SanSuite text-xs font-semibold flex items-center gap-1.5"
              >
                <Save size={13} /> {saveItemMutation.isPending ? "Saving..." : "Add to Catalog"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Record Period-End Stock Adjustment (Capium Parity) */}
      {showAdjustmentModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b bg-gray-50 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-gray-800">Record Stock Valuation Adjustment</h3>
                <p className="text-xs text-gray-500">Posts automated double-entry Cost of Sales & Asset journals</p>
              </div>
              <button onClick={() => setShowAdjustmentModal(false)}><X size={18} className="text-gray-400 hover:text-gray-600" /></button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="p-3 bg-purple-50/60 border border-purple-200 rounded-lg text-xs text-purple-900 space-y-1">
                <p className="font-semibold">UK Statutory Double-Entry Accounting:</p>
                <p>• <strong>Debit 1001 (Closing Stock Asset):</strong> Increases balance sheet current assets.</p>
                <p>• <strong>Credit 5200 (Closing Stock Adj.):</strong> Decreases Cost of Sales in Profit & Loss.</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Adjustment Date *</label>
                  <input 
                    type="date" 
                    value={adjForm.adjustmentDate} 
                    onChange={(e) => setAdjForm({ ...adjForm, adjustmentDate: e.target.value })} 
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Valuation Basis</label>
                  <select 
                    value={adjForm.valuationBasis} 
                    onChange={(e) => setAdjForm({ ...adjForm, valuationBasis: e.target.value })} 
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                  >
                    <option value="Lower of Cost and Net Realisable Value">Lower of Cost & NRV (UK GAAP)</option>
                    <option value="First In First Out (FIFO)">FIFO (First In First Out)</option>
                    <option value="Weighted Average Cost">Weighted Average Cost</option>
                    <option value="Specific Cost">Specific Cost</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Closing Stock Amount (£) *</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    placeholder="0.00"
                    value={adjForm.closingStockValue} 
                    onChange={(e) => setAdjForm({ ...adjForm, closingStockValue: e.target.value })} 
                    className="w-full px-3 py-2 text-sm border border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none font-mono" 
                  />
                  <p className="text-[10px] text-gray-400 mt-1">Debit: 1001 | Credit: 5200</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Opening Stock Reversal (£)</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    placeholder="0.00 (optional)"
                    value={adjForm.openingStockValue} 
                    onChange={(e) => setAdjForm({ ...adjForm, openingStockValue: e.target.value })} 
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none font-mono" 
                  />
                  <p className="text-[10px] text-gray-400 mt-1">Debit: 5201 | Credit: 1001</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Narration / Audit Notes</label>
                <textarea 
                  rows={2}
                  value={adjForm.description} 
                  onChange={(e) => setAdjForm({ ...adjForm, description: e.target.value })} 
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none" 
                />
              </div>
            </div>

            <div className="px-6 py-3 border-t bg-gray-50 flex justify-end gap-2">
              <button onClick={() => setShowAdjustmentModal(false)} className="px-4 py-2 text-xs border rounded-lg hover:bg-gray-100 font-medium">Cancel</button>
              <button 
                onClick={() => postAdjustmentMutation.mutate()} 
                disabled={postAdjustmentMutation.isPending}
                className="btn-SanSuite text-xs font-semibold flex items-center gap-1.5"
              >
                <ArrowDownUp size={13} /> {postAdjustmentMutation.isPending ? "Posting Journal..." : "Post Double-Entry Journal"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
