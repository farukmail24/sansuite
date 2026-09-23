import { useLocation, useRoute } from "wouter";
import AppLayout from "../../components/layout/AppLayout";
import { ChevronRight, Save, Plus, Trash2, CheckCircle2 } from "lucide-react";
import { bookkeepingSidebar, getClientSidebar } from "./sidebar";
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "../../lib/queryClient";
import { useToast } from "../../hooks/useToast";
import ClientGuard from "./ClientGuard";

export default function QuickEntryPage() {
  const [match, params] = useRoute("/bookkeeping/:id/*");
  const clientId = match ? params?.id : "";
  const [, navigate] = useLocation();
  const { toast } = useToast();

  if (!clientId) return <ClientGuard featureTitle="Quick Entry" />;

  const [rows, setRows] = useState([
    { 
      id: 1, 
      date: new Date().toISOString().split("T")[0], 
      description: "", 
      amount: "", 
      type: "Sales", 
      vatRate: "20", 
      nominal: "4000" 
    }
  ]);

  const { data: clients = [] } = useQuery({
    queryKey: ["/api/practice/clients"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/practice/clients");
      if (!res.ok) return [];
      return res.json();
    },
  });
  const client = clients.find((c: any) => String(c.id) === clientId);

  const saveBatchMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiRequest("POST", "/api/bookkeeping/quick-entry/batch", payload);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to save batch entries");
      }
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: [`/api/bookkeeping/invoices`] });
      queryClient.invalidateQueries({ queryKey: [`/api/bookkeeping/purchases`] });
      toast({ 
        title: "Entries Recorded", 
        description: `Successfully posted ${data.count || rows.length} transactions into the double-entry general ledger.` 
      });
      setRows([{ 
        id: Date.now(), 
        date: new Date().toISOString().split("T")[0], 
        description: "", 
        amount: "", 
        type: "Sales", 
        vatRate: "20", 
        nominal: "4000" 
      }]);
    },
    onError: (err: any) => {
      toast({ title: "Save Failed", description: err.message || "Failed to process batch entries", type: "error" });
    }
  });

  const addRow = () => {
    setRows([...rows, { 
      id: Date.now(), 
      date: new Date().toISOString().split("T")[0], 
      description: "", 
      amount: "", 
      type: "Sales", 
      vatRate: "20", 
      nominal: "4000" 
    }]);
  };

  const removeRow = (id: number) => {
    if (rows.length === 1) {
      toast({ title: "Notice", description: "At least one row is required." });
      return;
    }
    setRows(rows.filter(r => r.id !== id));
  };

  const updateRow = (id: number, field: string, value: string) => {
    setRows(rows.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const handleSave = () => {
    const validRows = rows.filter(r => r.description.trim() && Number(r.amount) > 0);
    if (validRows.length === 0) {
      toast({ title: "Validation Error", description: "Please enter at least one entry with description and valid amount.", type: "error" });
      return;
    }

    saveBatchMutation.mutate({
      clientId: Number(clientId),
      rows: validRows.map(r => ({
        date: r.date || new Date().toISOString().split("T")[0],
        description: r.description,
        amount: parseFloat(r.amount),
        type: r.type,
        vatRate: parseFloat(r.vatRate),
        nominal: r.nominal
      }))
    });
  };

  return (
    <AppLayout sidebar={clientId ? getClientSidebar(clientId) : bookkeepingSidebar} module="Bookkeeping">
      <div className="bg-gray-50 min-h-screen">
        <div className="bg-white px-4 py-2 border-b border-gray-200 flex items-center text-sm text-gray-500 gap-2">
          <button onClick={() => navigate("/bookkeeping")} className="hover:text-purple-600">Bookkeeping</button>
          <ChevronRight size={14} />
          <span className="font-medium text-gray-800">Quick Entry</span>
        </div>
        
        <div className="p-6 max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Quick Data Entry</h1>
              <p className="text-sm text-gray-500">Rapidly log multiple sales or purchase invoices.</p>
            </div>
            <button 
              onClick={handleSave} 
              disabled={saveBatchMutation.isPending}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded text-sm font-medium flex items-center shadow-sm disabled:opacity-50"
            >
              <Save size={16} className="mr-2" /> {saveBatchMutation.isPending ? "Posting Entries..." : "Save Entries"}
            </button>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-700">
                <tr>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Description</th>
                  <th className="px-4 py-3 font-medium">Amount (£)</th>
                  <th className="px-4 py-3 font-medium">VAT Rate (%)</th>
                  <th className="px-4 py-3 font-medium">Nominal</th>
                  <th className="px-4 py-3 font-medium w-16"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-2">
                      <input type="date" value={row.date} onChange={(e: any) => updateRow(row.id, 'date', e.target.value)} className="h-9 w-full px-2 border border-gray-300 rounded text-sm" />
                    </td>
                    <td className="px-4 py-2">
                      <select value={row.type} onChange={(e: any) => updateRow(row.id, 'type', e.target.value)} className="h-9 w-[120px] px-2 border border-gray-300 rounded text-sm">
                        <option value="Sales">Sales</option>
                        <option value="Purchase">Purchase</option>
                      </select>
                    </td>
                    <td className="px-4 py-2">
                      <input value={row.description} placeholder="Description..." onChange={(e: any) => updateRow(row.id, 'description', e.target.value)} className="h-9 w-full px-2 border border-gray-300 rounded text-sm" />
                    </td>
                    <td className="px-4 py-2">
                      <input type="number" value={row.amount} placeholder="0.00" onChange={(e: any) => updateRow(row.id, 'amount', e.target.value)} className="h-9 w-full px-2 border border-gray-300 rounded text-sm" />
                    </td>
                    <td className="px-4 py-2">
                      <select value={row.vatRate} onChange={(e: any) => updateRow(row.id, 'vatRate', e.target.value)} className="h-9 w-[90px] px-2 border border-gray-300 rounded text-sm">
                        <option value="20">20%</option>
                        <option value="5">5%</option>
                        <option value="0">0%</option>
                      </select>
                    </td>
                    <td className="px-4 py-2">
                      <input value={row.nominal} onChange={(e: any) => updateRow(row.id, 'nominal', e.target.value)} className="h-9 w-[80px] px-2 border border-gray-300 rounded text-sm" />
                    </td>
                    <td className="px-4 py-2 text-center">
                      <button onClick={() => removeRow(row.id)} className="text-gray-400 hover:text-red-500">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="p-4 bg-gray-50 border-t border-gray-200">
              <button onClick={addRow} className="px-3 py-1.5 border border-gray-300 rounded text-sm font-medium hover:bg-white flex items-center">
                <Plus size={16} className="mr-2" /> Add Row
              </button>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
