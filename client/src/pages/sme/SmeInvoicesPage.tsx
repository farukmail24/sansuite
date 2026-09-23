import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import SmeLayout from "../../components/layout/SmeLayout";
import { apiRequest, queryClient } from "../../lib/queryClient";
import { useToast } from "../../hooks/useToast";
import {
  FileText, Plus, Search, Filter, CheckCircle2,
  Clock, Download, ArrowUpRight, X
} from "lucide-react";

export default function SmeInvoicesPage() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showModal, setShowModal] = useState(false);

  // Form State
  const [customer, setCustomer] = useState("");
  const [amount, setAmount] = useState("");
  const [vat, setVat] = useState("");
  const [notes, setNotes] = useState("");

  const { data: workspace, isLoading } = useQuery({
    queryKey: ["/api/portal/my-workspace"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/portal/my-workspace");
      if (!res.ok) throw new Error("Failed to load invoices");
      return res.json();
    },
  });

  const createInvoiceMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/portal/my-invoices", {
        customerName: customer,
        totalAmount: amount,
        vatAmount: vat || "0.00",
        notes,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to create invoice");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Invoice Created", description: "Sales invoice successfully recorded." });
      setShowModal(false);
      setCustomer("");
      setAmount("");
      setVat("");
      setNotes("");
      queryClient.invalidateQueries({ queryKey: ["/api/portal/my-workspace"] });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const invoices = workspace?.invoices || [];
  const filtered = invoices.filter((inv: any) => {
    const matchesSearch =
      (inv.customerName || "").toLowerCase().includes(search.toLowerCase()) ||
      (inv.invoiceNumber || "").toLowerCase().includes(search.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || (inv.status || "").toLowerCase() === statusFilter.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  const totalInvoiced = invoices.reduce((sum: number, i: any) => sum + Number(i.grandTotal || 0), 0);

  return (
    <SmeLayout module="Sales & Invoices">
      <div className="space-y-6">
        {/* Header Strip */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <FileText size={22} className="text-blue-600" />
              Sales Invoices
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Create and manage customer invoices. Directly synchronized with your CA firm's bookkeeping records.
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition active:scale-95"
          >
            <Plus size={15} /> Create Invoice
          </button>
        </div>

        {/* Filter / Search Bar */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-72">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search customer or invoice #..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs font-semibold text-gray-500">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="all">All Invoices</option>
              <option value="paid">Paid</option>
              <option value="unpaid">Unpaid / Issued</option>
            </select>
          </div>
        </div>

        {/* Table / List */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="py-12 text-center text-xs text-gray-400">Loading invoices...</div>
          ) : filtered.length === 0 ? (
            <div className="py-14 text-center px-4">
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 mx-auto flex items-center justify-center mb-3">
                <FileText size={22} />
              </div>
              <h3 className="text-sm font-semibold text-gray-900">No Invoices Found</h3>
              <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1 mb-4">
                {search ? "No invoices matched your filter criteria." : "Create your first sales invoice to bill your customers."}
              </p>
              {!search && (
                <button
                  onClick={() => setShowModal(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 shadow-sm"
                >
                  <Plus size={14} className="inline mr-1" /> Create First Invoice
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 text-gray-500 font-semibold uppercase border-b border-gray-200">
                  <tr>
                    <th className="px-5 py-3">Invoice #</th>
                    <th className="px-5 py-3">Customer</th>
                    <th className="px-5 py-3">Issue Date</th>
                    <th className="px-5 py-3">Due Date</th>
                    <th className="px-5 py-3 text-right">VAT</th>
                    <th className="px-5 py-3 text-right">Grand Total</th>
                    <th className="px-5 py-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map((inv: any) => (
                    <tr key={inv.id} className="hover:bg-blue-50/20 transition-colors">
                      <td className="px-5 py-3.5 font-mono font-bold text-gray-900">{inv.invoiceNumber}</td>
                      <td className="px-5 py-3.5 font-semibold text-gray-800">{inv.customerName || "Customer"}</td>
                      <td className="px-5 py-3.5 text-gray-500">
                        {inv.invoiceDate ? new Date(inv.invoiceDate).toLocaleDateString("en-GB") : "—"}
                      </td>
                      <td className="px-5 py-3.5 text-gray-500">
                        {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString("en-GB") : "30 Days"}
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono text-gray-500">
                        £{Number(inv.vatTotal || 0).toFixed(2)}
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono font-bold text-gray-900">
                        £{Number(inv.grandTotal || 0).toFixed(2)}
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          inv.status === "Paid"
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                            : "bg-blue-100 text-blue-800 border border-blue-200"
                        }`}>
                          {inv.status || "Issued"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                  <FileText size={17} />
                </div>
                <h3 className="text-base font-bold text-gray-900">Create Sales Invoice</h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                createInvoiceMutation.mutate();
              }}
              className="mt-4 space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Customer / Company Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Apex Global Ltd"
                  value={customer}
                  onChange={(e) => setCustomer(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Invoice Amount (£) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    VAT Amount (£)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={vat}
                    onChange={(e) => setVat(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Notes / Payment Terms
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Due within 30 days. Bank details provided on invoice."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createInvoiceMutation.isPending}
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm disabled:opacity-50"
                >
                  {createInvoiceMutation.isPending ? "Creating..." : "Issue Invoice"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </SmeLayout>
  );
}
