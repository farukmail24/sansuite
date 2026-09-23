import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import AppLayout from "../../components/layout/AppLayout";
import { apiRequest } from "../../lib/queryClient";
import { useToast } from "../../hooks/useToast";
import { Save, Plus, X, PackageOpen, ArrowDownUp } from "lucide-react";
import { bookkeepingSidebar, getClientSidebar } from "./sidebar";
import ClientGuard from "./ClientGuard";

export default function InventoryPage() {
  const [match, params] = useRoute("/bookkeeping/:id/inventory");
  const clientId = match ? params.id : "";
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const [showModal, setShowModal] = useState(false);
  
  const { data: items = [] } = useQuery({
    queryKey: ["/api/bookkeeping/items"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/bookkeeping/items");
      return res.ok ? res.json() : [];
    }
  });

  const inventory = items.filter((i: any) => i.type === "Product").map((item: any) => ({
    ...item,
    quantityOnHand: 0,
    reorderLevel: 0,
    averageCost: item.purchasePrice,
    totalValue: 0
  }));

  const [formData, setFormData] = useState({
    itemCode: "",
    name: "",
    quantityOnHand: "0",
    reorderLevel: "10",
    averageCost: "0.00"
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["/api/practice/clients"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/practice/clients");
      return res.json();
    },
  });
  const client = clients.find((c: any) => String(c.id) === clientId);

  const saveInventory = () => {
    toast({ title: "Not Supported", description: "Direct inventory adjustments require backend integration.", type: "error" });
    setShowModal(false);
  };

  if (!clientId) {
    return <ClientGuard featureTitle="Inventory" />;
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
            <span className="text-gray-800">Inventory Management</span>
          </div>
          <div className="flex gap-2">
            <button className="bg-white border border-gray-300 text-gray-700 px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1 hover:bg-gray-50">
              <ArrowDownUp size={14} /> Stock Adjustment
            </button>
            <button onClick={() => setShowModal(true)} className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1">
              <Plus size={14} /> Add Stock Item
            </button>
          </div>
        </div>

        <div className="p-6 max-w-6xl mx-auto space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white p-4 rounded-xl border shadow-sm">
              <div className="text-sm text-gray-500 mb-1">Total Items in Stock</div>
              <div className="text-2xl font-bold text-gray-800">
                {inventory.reduce((sum: number, item: any) => sum + item.quantityOnHand, 0)}
              </div>
            </div>
            <div className="bg-white p-4 rounded-xl border shadow-sm">
              <div className="text-sm text-gray-500 mb-1">Total Inventory Value</div>
              <div className="text-2xl font-bold text-gray-800">
                £{inventory.reduce((sum: number, item: any) => sum + parseFloat(item.totalValue), 0).toFixed(2)}
              </div>
            </div>
            <div className="bg-white p-4 rounded-xl border shadow-sm bg-red-50/50">
              <div className="text-sm text-red-500 mb-1">Low Stock Alerts</div>
              <div className="text-2xl font-bold text-red-600">
                {inventory.filter((item: any) => item.quantityOnHand <= item.reorderLevel).length}
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3 bg-gray-50/50">
              <div className="w-8 h-8 bg-green-100 text-green-600 rounded-lg flex items-center justify-center">
                <PackageOpen size={16} />
              </div>
              <div>
                <h2 className="font-semibold text-gray-800">Stock Levels</h2>
                <p className="text-xs text-gray-500">Track quantities and values of physical products.</p>
              </div>
            </div>
            
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 text-xs font-semibold text-gray-500 border-b border-gray-200 uppercase">
                  <th className="px-5 py-3">Item Code</th>
                  <th className="px-5 py-3">Product Name</th>
                  <th className="px-5 py-3 text-right">Qty on Hand</th>
                  <th className="px-5 py-3 text-right">Reorder Level</th>
                  <th className="px-5 py-3 text-right">Avg. Cost</th>
                  <th className="px-5 py-3 text-right">Total Value</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {inventory.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-10 text-gray-500">No inventory items tracked.</td></tr>
                ) : inventory.map((i: any) => (
                  <tr key={i.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                    <td className="px-5 py-3 text-gray-600 font-mono">{i.itemCode}</td>
                    <td className="px-5 py-3 font-medium text-gray-800">{i.name}</td>
                    <td className="px-5 py-3 text-right font-medium">
                      <span className={i.quantityOnHand <= i.reorderLevel ? "text-red-600 flex justify-end items-center gap-1" : "text-gray-800"}>
                        {i.quantityOnHand <= i.reorderLevel && <span className="w-2 h-2 rounded-full bg-red-500"></span>}
                        {i.quantityOnHand}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right text-gray-500">{i.reorderLevel}</td>
                    <td className="px-5 py-3 text-right font-mono text-gray-600">£{parseFloat(i.averageCost).toFixed(2)}</td>
                    <td className="px-5 py-3 text-right font-mono font-bold text-gray-800">£{parseFloat(i.totalValue).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b bg-gray-50 flex justify-between items-center">
              <h3 className="font-semibold text-gray-800">Add Stock Item</h3>
              <button onClick={() => setShowModal(false)}><X size={20} className="text-gray-400" /></button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Product Name *</label>
                <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Item Code</label>
                <input type="text" value={formData.itemCode} onChange={(e) => setFormData({ ...formData, itemCode: e.target.value })} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500" />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quantity On Hand</label>
                  <input type="number" value={formData.quantityOnHand} onChange={(e) => setFormData({ ...formData, quantityOnHand: e.target.value })} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reorder Level</label>
                  <input type="number" value={formData.reorderLevel} onChange={(e) => setFormData({ ...formData, reorderLevel: e.target.value })} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Average Cost (£)</label>
                <input type="number" step="0.01" value={formData.averageCost} onChange={(e) => setFormData({ ...formData, averageCost: e.target.value })} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500" />
              </div>
            </div>

            <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-100">Cancel</button>
              <button onClick={saveInventory} className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg font-medium flex items-center gap-2">
                <Save size={14} /> Add to Stock
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
