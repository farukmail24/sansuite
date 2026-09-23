import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, useRoute } from "wouter";
import AppLayout from "../../components/layout/AppLayout";
import { LayoutDashboard, FileText, ShoppingCart, Wallet, BarChart2, Settings, Plus, Trash2, X, Save, Pencil, Clock } from "lucide-react";
import { apiRequest } from "../../lib/queryClient";
import { useToast } from "../../hooks/useToast";
import { useAuth } from "../../hooks/useAuth";
import { bookkeepingSidebar, getClientSidebar } from "./sidebar";

const VAT_RATES = [
  { label: "Standard 20%", value: 20 },
  { label: "Reduced 5%", value: 5 },
  { label: "Zero 0%", value: 0 },
  { label: "Exempt", value: -1 },
];

const INVOICE_STATUSES = ["Draft", "Unpaid", "Paid", "PartiallyPaid", "Void"];

interface LineItem { description: string; quantity: string; unitPrice: string; vatRate: string; }
const emptyLine = (): LineItem => ({ description: "", quantity: "1", unitPrice: "", vatRate: "20" });

export default function InvoicesPage() {
  const [match, params] = useRoute("/bookkeeping/:id/*");
  const clientId = match ? params?.id : "";
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const canEdit = user?.role === "admin" || user?.role === "accountant";

  const [showForm, setShowForm] = useState(false);
  const [editModal, setEditModal] = useState<any>(null);
  const [form, setForm] = useState({
    clientId: "", customerId: "", invoiceDate: new Date().toISOString().split("T")[0],
    dueDate: "", invoiceType: "Invoice", notes: "",
  });
  const [lines, setLines] = useState<LineItem[]>([emptyLine()]);

  // Clients list
  const { data: clients = [] } = useQuery({
    queryKey: ["/api/practice/clients"],
    queryFn: async () => { const r = await apiRequest("GET", "/api/practice/clients"); return r.ok ? r.json() : []; },
  });

  // Invoices list
  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ["/api/bookkeeping/invoices"],
    queryFn: async () => { const r = await apiRequest("GET", "/api/bookkeeping/invoices"); return r.ok ? r.json() : []; },
  });

  // Contacts (customers)
  const { data: contacts = [] } = useQuery({
    queryKey: ["/api/bookkeeping/contacts"],
    queryFn: async () => { const r = await apiRequest("GET", "/api/bookkeeping/contacts"); return r.ok ? r.json() : []; },
    select: (d: any[]) => d.filter(c => c.contactType === "Customer"),
  });

  // Computed totals
  const totals = lines.reduce((acc, l) => {
    const qty = parseFloat(l.quantity || "0");
    const price = parseFloat(l.unitPrice || "0");
    const vatRate = parseFloat(l.vatRate) >= 0 ? parseFloat(l.vatRate) : 0;
    const net = qty * price;
    const vat = net * (vatRate / 100);
    return { net: acc.net + net, vat: acc.vat + vat };
  }, { net: 0, vat: 0 });

  const createInvoice = useMutation({
    mutationFn: async () => {
      if (!form.clientId) throw new Error("Please select a client");
      const res = await apiRequest("POST", "/api/bookkeeping/invoices", {
        clientId: parseInt(form.clientId),
        customerId: form.customerId ? parseInt(form.customerId) : null,
        invoiceDate: form.invoiceDate,
        dueDate: form.dueDate || null,
        invoiceType: form.invoiceType,
        notes: form.notes,
        subTotal: totals.net.toFixed(2),
        vatTotal: totals.vat.toFixed(2),
        grandTotal: (totals.net + totals.vat).toFixed(2),
        items: lines.map(l => ({
          description: l.description,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          vatRate: l.vatRate === "-1" ? 0 : l.vatRate,
          vatAmount: (parseFloat(l.quantity) * parseFloat(l.unitPrice || "0") * (parseFloat(l.vatRate) / 100)).toFixed(2),
          netAmount: (parseFloat(l.quantity) * parseFloat(l.unitPrice || "0")).toFixed(2),
        })),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Invoice Created", type: "success" });
      qc.invalidateQueries({ queryKey: ["/api/bookkeeping/invoices"] });
      setShowForm(false);
      setForm({ clientId: "", customerId: "", invoiceDate: new Date().toISOString().split("T")[0], dueDate: "", invoiceType: "Invoice", notes: "" });
      setLines([emptyLine()]);
    },
    onError: (e: any) => toast({ title: "Failed", description: e.message, type: "error" }),
  });

  const editInvoiceMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await apiRequest("PUT", `/api/bookkeeping/invoices/${id}`, data);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || "Failed to update invoice");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Invoice Updated", description: "Changes saved successfully." });
      qc.invalidateQueries({ queryKey: ["/api/bookkeeping/invoices"] });
      setEditModal(null);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, type: "error" }),
  });

  const deleteInvoiceMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/bookkeeping/invoices/${id}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || "Failed to delete invoice");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Invoice Deleted" });
      qc.invalidateQueries({ queryKey: ["/api/bookkeeping/invoices"] });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, type: "error" }),
  });

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      Draft: "badge-gray",
      Unpaid: "badge-warning",
      Paid: "badge-success",
      PartiallyPaid: "badge-warning",
      Void: "badge-gray",
    };
    return map[status] || "badge-gray";
  };

  const updateLine = (i: number, k: keyof LineItem, v: string) => {
    setLines(prev => prev.map((l, idx) => idx === i ? { ...l, [k]: v } : l));
  };

  return (
    <AppLayout sidebar={clientId ? getClientSidebar(clientId) : bookkeepingSidebar} module="Bookkeeping">
      <div className="p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400">Bookkeeping / Sales / Invoices</p>
            <h1 className="text-lg font-bold text-gray-800">Sales Invoices</h1>
            {!canEdit && (
              <p className="mt-1 text-xs text-amber-600 flex items-center gap-1">
                <Clock size={12} /> View-only — your role ({user?.role}) cannot edit or delete invoices.
              </p>
            )}
          </div>
          {canEdit && (
            <button onClick={() => setShowForm(true)} className="btn-SanSuite flex items-center gap-2">
              <Plus size={14} /> New Invoice
            </button>
          )}
        </div>

        {/* Invoice list */}
        <div className="SanSuite-card overflow-hidden">
          <table className="SanSuite-table">
            <thead><tr>
              <th>Invoice No.</th><th>Client</th><th>Type</th><th>Date</th><th>Due Date</th>
              <th>Net</th><th>VAT</th><th>Total</th><th>Status</th>
              {canEdit && <th className="text-right pr-4">Actions</th>}
            </tr></thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={canEdit ? 10 : 9} className="text-center py-8 text-gray-400">Loading...</td></tr>
              ) : invoices.length === 0 ? (
                <tr><td colSpan={canEdit ? 10 : 9} className="text-center py-8 text-gray-400 text-xs">No invoices yet. Click New Invoice to create one.</td></tr>
              ) : invoices.map((inv: any) => (
                <tr key={inv.id}>
                  <td className="font-mono text-xs font-semibold text-purple-600">{inv.invoiceNumber}</td>
                  <td className="text-gray-700">{inv.clientName || "—"}</td>
                  <td>{inv.invoiceType}</td>
                  <td>{inv.invoiceDate ? new Date(inv.invoiceDate).toLocaleDateString("en-GB") : "—"}</td>
                  <td>{inv.dueDate ? new Date(inv.dueDate).toLocaleDateString("en-GB") : "—"}</td>
                  <td>£{parseFloat(inv.subTotal || "0").toLocaleString("en-GB", { minimumFractionDigits: 2 })}</td>
                  <td>£{parseFloat(inv.vatTotal || "0").toLocaleString("en-GB", { minimumFractionDigits: 2 })}</td>
                  <td className="font-semibold">£{parseFloat(inv.grandTotal || "0").toLocaleString("en-GB", { minimumFractionDigits: 2 })}</td>
                  <td><span className={statusBadge(inv.status)}>{inv.status}</span></td>
                  {canEdit && (
                    <td className="text-right pr-2">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => setEditModal({ ...inv })}
                          className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded"
                          title="Edit Invoice"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Delete Invoice ${inv.invoiceNumber}? This will also remove its journal entries.`))
                              deleteInvoiceMutation.mutate(inv.id);
                          }}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                          title="Delete Invoice"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Invoice Modal */}
      {showForm && canEdit && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col">
            <div className="px-6 py-4 border-b flex items-center justify-between bg-gray-50 rounded-t-xl">
              <h2 className="text-base font-bold text-gray-800 flex items-center gap-2">
                <FileText size={16} className="text-purple-600" /> New Sales Invoice
              </h2>
              <button onClick={() => setShowForm(false)}><X size={18} className="text-gray-400 hover:text-gray-600" /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Header fields */}
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
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Invoice Type</label>
                  <select value={form.invoiceType} onChange={e => setForm({ ...form, invoiceType: e.target.value })}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2">
                    {["Invoice", "Credit Note"].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Customer</label>
                  <select value={form.customerId} onChange={e => setForm({ ...form, customerId: e.target.value })}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2">
                    <option value="">Select customer...</option>
                    {contacts.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Invoice Date</label>
                  <input type="date" value={form.invoiceDate} onChange={e => setForm({ ...form, invoiceDate: e.target.value })}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Due Date</label>
                  <input type="date" value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2" />
                </div>
              </div>

              {/* Line Items Grid */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wide">Invoice Lines</h3>
                  <button onClick={() => setLines(p => [...p, emptyLine()])}
                    className="text-xs text-purple-600 hover:text-purple-800 flex items-center gap-1">
                    <Plus size={12} /> Add Row
                  </button>
                </div>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 w-2/5">Description</th>
                        <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 w-1/12">Qty</th>
                        <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 w-1/6">Unit Price (£)</th>
                        <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 w-1/5">VAT Rate</th>
                        <th className="text-right px-3 py-2 text-xs font-semibold text-gray-500">Amount</th>
                        <th className="px-2"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {lines.map((l, i) => {
                        const qty = parseFloat(l.quantity || "0");
                        const price = parseFloat(l.unitPrice || "0");
                        const vatRate = parseFloat(l.vatRate) >= 0 ? parseFloat(l.vatRate) : 0;
                        const net = qty * price;
                        const vat = net * (vatRate / 100);
                        return (
                          <tr key={i}>
                            <td className="px-2 py-1"><input value={l.description} onChange={e => updateLine(i, "description", e.target.value)} placeholder="Service description" className="w-full text-sm px-2 py-1.5 border border-gray-200 rounded" /></td>
                            <td className="px-2 py-1"><input type="number" value={l.quantity} onChange={e => updateLine(i, "quantity", e.target.value)} className="w-full text-sm px-2 py-1.5 border border-gray-200 rounded text-center" /></td>
                            <td className="px-2 py-1"><input type="number" value={l.unitPrice} onChange={e => updateLine(i, "unitPrice", e.target.value)} placeholder="0.00" className="w-full text-sm px-2 py-1.5 border border-gray-200 rounded" /></td>
                            <td className="px-2 py-1">
                              <select value={l.vatRate} onChange={e => updateLine(i, "vatRate", e.target.value)}
                                className="w-full text-sm px-2 py-1.5 border border-gray-200 rounded">
                                {VAT_RATES.map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
                              </select>
                            </td>
                            <td className="px-3 py-1 text-right text-gray-700 font-medium">£{(net + vat).toFixed(2)}</td>
                            <td className="px-2 py-1">
                              {lines.length > 1 && (
                                <button onClick={() => setLines(p => p.filter((_, idx) => idx !== i))} className="text-red-400 hover:text-red-600">
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {/* Totals */}
                <div className="mt-3 flex justify-end">
                  <div className="w-72 space-y-1 text-sm">
                    <div className="flex justify-between text-gray-500"><span>Net Total</span><span>£{totals.net.toFixed(2)}</span></div>
                    <div className="flex justify-between text-gray-500"><span>VAT Total</span><span>£{totals.vat.toFixed(2)}</span></div>
                    <div className="flex justify-between font-bold text-gray-800 border-t pt-1 mt-1">
                      <span>Grand Total</span><span>£{(totals.net + totals.vat).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Notes</label>
                <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                  rows={2} placeholder="Additional notes..." className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 resize-none" />
              </div>
            </div>

            <div className="px-6 py-4 border-t bg-gray-50 rounded-b-xl flex justify-end gap-3">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-100">Cancel</button>
              <button onClick={() => createInvoice.mutate()} disabled={createInvoice.isPending || !form.clientId}
                className="btn-SanSuite flex items-center gap-2 disabled:opacity-50">
                <Save size={14} /> {createInvoice.isPending ? "Saving..." : "Save Invoice"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Invoice Modal */}
      {editModal && canEdit && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b bg-gray-50/50 flex justify-between items-center">
              <div>
                <h3 className="font-semibold text-gray-800">Edit Invoice</h3>
                <p className="text-xs text-gray-400 mt-0.5">{editModal.invoiceNumber}</p>
              </div>
              <button onClick={() => setEditModal(null)}><X size={20} className="text-gray-400" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select value={editModal.status || "Draft"} onChange={(e) => setEditModal({ ...editModal, status: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500">
                  {INVOICE_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                <input type="date" value={editModal.dueDate ? editModal.dueDate.split("T")[0] : ""}
                  onChange={(e) => setEditModal({ ...editModal, dueDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea value={editModal.notes || ""} onChange={(e) => setEditModal({ ...editModal, notes: e.target.value })}
                  rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 resize-none" />
              </div>
            </div>
            <div className="px-6 py-4 border-t bg-gray-50/50 flex justify-end gap-3">
              <button onClick={() => setEditModal(null)} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer">Cancel</button>
              <button
                disabled={editInvoiceMutation.isPending}
                className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg font-medium disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                onClick={() => editInvoiceMutation.mutate({ id: editModal.id, data: { status: editModal.status, notes: editModal.notes, dueDate: editModal.dueDate } })}
              >
                <Save size={15} /> {editInvoiceMutation.isPending ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
