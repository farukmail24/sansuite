import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AppLayout from "../../components/layout/AppLayout";
import { LayoutDashboard, FileText, ShoppingCart, Wallet, BarChart2, Settings, Plus, Trash2, X, Save } from "lucide-react";
import { apiRequest } from "../../lib/queryClient";
import { useToast } from "../../hooks/useToast";
import { bookkeepingSidebar, getClientSidebar } from "./sidebar";



const VAT_RATES = [
  { label: "Standard 20%", value: 20 },
  { label: "Reduced 5%", value: 5 },
  { label: "Zero 0%", value: 0 },
  { label: "Exempt", value: -1 },
];

interface LineItem { description: string; amount: string; vatRate: string; }
const emptyLine = (): LineItem => ({ description: "", amount: "", vatRate: "20" });

export default function PurchasesPage() {
  const [match, params] = useRoute("/bookkeeping/:id/purchases");
  const clientId = match ? params.id : "";
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    clientId: clientId || "", supplierId: "", billDate: new Date().toISOString().split("T")[0],
    dueDate: "", purchaseType: "Invoice", notes: "",
  });
  const [lines, setLines] = useState<LineItem[]>([emptyLine()]);

  const { data: clients = [] } = useQuery({
    queryKey: ["/api/practice/clients"],
    queryFn: async () => { const r = await apiRequest("GET", "/api/practice/clients"); return r.ok ? r.json() : []; },
  });
  const { data: purchases = [], isLoading } = useQuery({
    queryKey: ["/api/bookkeeping/purchases"],
    queryFn: async () => { const r = await apiRequest("GET", "/api/bookkeeping/purchases"); return r.ok ? r.json() : []; },
  });
  const { data: suppliers = [] } = useQuery({
    queryKey: ["/api/bookkeeping/contacts", "supplier"],
    queryFn: async () => { const r = await apiRequest("GET", "/api/bookkeeping/contacts"); return r.ok ? r.json() : []; },
    select: (d: any[]) => d.filter(c => c.contactType === "Supplier"),
  });

  const totals = lines.reduce((acc, l) => {
    const amount = parseFloat(l.amount || "0");
    const vatRate = parseFloat(l.vatRate) >= 0 ? parseFloat(l.vatRate) : 0;
    const vat = amount * (vatRate / 100);
    return { net: acc.net + amount, vat: acc.vat + vat };
  }, { net: 0, vat: 0 });

  const createPurchase = useMutation({
    mutationFn: async () => {
      if (!form.clientId) throw new Error("Please select a client");
      const res = await apiRequest("POST", "/api/bookkeeping/purchases", {
        clientId: parseInt(form.clientId),
        supplierId: form.supplierId ? parseInt(form.supplierId) : null,
        billDate: form.billDate,
        dueDate: form.dueDate || null,
        purchaseType: form.purchaseType,
        notes: form.notes,
        subTotal: totals.net.toFixed(2),
        vatTotal: totals.vat.toFixed(2),
        grandTotal: (totals.net + totals.vat).toFixed(2),
        items: lines.map(l => ({
          description: l.description,
          quantity: "1",
          unitPrice: l.amount,
          vatRate: l.vatRate === "-1" ? 0 : l.vatRate,
          vatAmount: (parseFloat(l.amount || "0") * (parseFloat(l.vatRate) / 100)).toFixed(2),
          netAmount: l.amount,
        })),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Purchase Bill Created", type: "success" });
      qc.invalidateQueries({ queryKey: ["/api/bookkeeping/purchases"] });
      setShowForm(false);
      setForm({ clientId: "", supplierId: "", billDate: new Date().toISOString().split("T")[0], dueDate: "", purchaseType: "Invoice", notes: "" });
      setLines([emptyLine()]);
    },
    onError: (e: any) => toast({ title: "Failed", description: e.message, type: "error" }),
  });

  const updateLine = (i: number, k: keyof LineItem, v: string) =>
    setLines(prev => prev.map((l, idx) => idx === i ? { ...l, [k]: v } : l));

  return (
    <AppLayout sidebar={clientId ? getClientSidebar(clientId) : bookkeepingSidebar} module="Bookkeeping">
      <div className="p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400">Bookkeeping / Purchase / Purchases</p>
            <h1 className="text-lg font-bold text-gray-800">Purchase Bills</h1>
          </div>
          <button onClick={() => setShowForm(true)} className="btn-SanSuite flex items-center gap-2">
            <Plus size={14} /> New Purchase
          </button>
        </div>

        <div className="SanSuite-card overflow-hidden">
          <table className="SanSuite-table">
            <thead><tr>
              <th>Ref No.</th><th>Type</th><th>Bill Date</th><th>Due Date</th>
              <th>Net</th><th>VAT</th><th>Total</th><th>Status</th>
            </tr></thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={8} className="text-center py-8 text-gray-400">Loading...</td></tr>
              ) : purchases.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-8 text-gray-400 text-xs">No purchases yet.</td></tr>
              ) : purchases.map((p: any) => (
                <tr key={p.id}>
                  <td className="font-mono text-xs font-semibold text-purple-600">{p.billNumber}</td>
                  <td>{p.purchaseType}</td>
                  <td>{p.billDate ? new Date(p.billDate).toLocaleDateString("en-GB") : "—"}</td>
                  <td>{p.dueDate ? new Date(p.dueDate).toLocaleDateString("en-GB") : "—"}</td>
                  <td>£{parseFloat(p.subTotal || "0").toFixed(2)}</td>
                  <td>£{parseFloat(p.vatTotal || "0").toFixed(2)}</td>
                  <td className="font-semibold">£{parseFloat(p.grandTotal || "0").toFixed(2)}</td>
                  <td><span className={p.status === "Paid" ? "badge-success" : "badge-warning"}>{p.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b flex items-center justify-between bg-gray-50 rounded-t-xl">
              <h2 className="text-base font-bold text-gray-800 flex items-center gap-2">
                <ShoppingCart size={16} className="text-purple-600" /> New Purchase Bill
              </h2>
              <button onClick={() => setShowForm(false)}><X size={18} className="text-gray-400" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Client *</label>
                  <select value={form.clientId} onChange={e => setForm({ ...form, clientId: e.target.value })}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2">
                    <option value="">Select client...</option>
                    {clients.map((c: any) => <option key={c.id} value={c.id}>{c.clientName}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Supplier</label>
                  <select value={form.supplierId} onChange={e => setForm({ ...form, supplierId: e.target.value })}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2">
                    <option value="">Select supplier...</option>
                    {suppliers.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Purchase Type</label>
                  <select value={form.purchaseType} onChange={e => setForm({ ...form, purchaseType: e.target.value })}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2">
                    {["Invoice", "Credit Note"].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Bill Date</label>
                  <input type="date" value={form.billDate} onChange={e => setForm({ ...form, billDate: e.target.value })}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Due Date</label>
                  <input type="date" value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2" />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wide">Line Items</h3>
                  <button onClick={() => setLines(p => [...p, emptyLine()])}
                    className="text-xs text-purple-600 hover:text-purple-800 flex items-center gap-1"><Plus size={12} /> Add Row</button>
                </div>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 w-1/2">Description</th>
                        <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">Net Amount (£)</th>
                        <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">VAT Rate</th>
                        <th className="text-right px-3 py-2 text-xs font-semibold text-gray-500">Gross</th>
                        <th className="px-2"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {lines.map((l, i) => {
                        const net = parseFloat(l.amount || "0");
                        const vatRate = parseFloat(l.vatRate) >= 0 ? parseFloat(l.vatRate) : 0;
                        return (
                          <tr key={i}>
                            <td className="px-2 py-1"><input value={l.description} onChange={e => updateLine(i, "description", e.target.value)} placeholder="Description" className="w-full text-sm px-2 py-1.5 border border-gray-200 rounded" /></td>
                            <td className="px-2 py-1"><input type="number" value={l.amount} onChange={e => updateLine(i, "amount", e.target.value)} placeholder="0.00" className="w-full text-sm px-2 py-1.5 border border-gray-200 rounded" /></td>
                            <td className="px-2 py-1">
                              <select value={l.vatRate} onChange={e => updateLine(i, "vatRate", e.target.value)} className="w-full text-sm px-2 py-1.5 border border-gray-200 rounded">
                                {VAT_RATES.map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
                              </select>
                            </td>
                            <td className="px-3 py-1 text-right font-medium">£{(net + net * (vatRate / 100)).toFixed(2)}</td>
                            <td className="px-2 py-1">{lines.length > 1 && <button onClick={() => setLines(p => p.filter((_, idx) => idx !== i))} className="text-red-400 hover:text-red-600"><Trash2 size={14} /></button>}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="mt-3 flex justify-end">
                  <div className="w-64 space-y-1 text-sm">
                    <div className="flex justify-between text-gray-500"><span>Net Total</span><span>£{totals.net.toFixed(2)}</span></div>
                    <div className="flex justify-between text-gray-500"><span>VAT Total</span><span>£{totals.vat.toFixed(2)}</span></div>
                    <div className="flex justify-between font-bold text-gray-800 border-t pt-1"><span>Grand Total</span><span>£{(totals.net + totals.vat).toFixed(2)}</span></div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Notes</label>
                <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                  rows={2} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 resize-none" />
              </div>
            </div>

            <div className="px-6 py-4 border-t bg-gray-50 rounded-b-xl flex justify-end gap-3">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-100">Cancel</button>
              <button onClick={() => createPurchase.mutate()} disabled={createPurchase.isPending || !form.clientId}
                className="btn-SanSuite flex items-center gap-2 disabled:opacity-50">
                <Save size={14} /> {createPurchase.isPending ? "Saving..." : "Save Purchase"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
