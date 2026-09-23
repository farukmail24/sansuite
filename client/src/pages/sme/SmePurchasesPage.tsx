import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import SmeLayout from "../../components/layout/SmeLayout";
import { apiRequest, queryClient } from "../../lib/queryClient";
import { useToast } from "../../hooks/useToast";
import {
  Receipt, Plus, Search, UploadCloud, CheckCircle2,
  Clock, Download, ArrowDownLeft, X
} from "lucide-react";

export default function SmePurchasesPage() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);

  // Form State
  const [supplier, setSupplier] = useState("");
  const [amount, setAmount] = useState("");
  const [vat, setVat] = useState("");
  const [notes, setNotes] = useState("");

  const { data: workspace, isLoading } = useQuery({
    queryKey: ["/api/portal/my-workspace"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/portal/my-workspace");
      if (!res.ok) throw new Error("Failed to load purchases");
      return res.json();
    },
  });

  const uploadReceiptMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/portal/my-receipts", {
        supplierName: supplier,
        amount,
        vatAmount: vat || "0.00",
        notes,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to upload receipt");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Receipt Uploaded", description: "Expense receipt bridged to accountant." });
      setShowModal(false);
      setSupplier("");
      setAmount("");
      setVat("");
      setNotes("");
      queryClient.invalidateQueries({ queryKey: ["/api/portal/my-workspace"] });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const purchases = workspace?.purchases || [];
  const filtered = purchases.filter((p: any) => {
    return (
      (p.supplierName || "").toLowerCase().includes(search.toLowerCase()) ||
      (p.billNumber || "").toLowerCase().includes(search.toLowerCase())
    );
  });

  return (
    <SmeLayout module="Bills & Expenses">
      <div className="space-y-6">
        {/* Header Strip */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Receipt size={22} className="text-emerald-600" />
              Bills & Expense Receipts
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Upload expenses and supplier invoices. Direct live bridging into your firm's bookkeeping records.
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition active:scale-95"
          >
            <UploadCloud size={15} /> Upload Receipt
          </button>
        </div>

        {/* Search Bar */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-72">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search supplier or bill #..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* Table / List */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="py-12 text-center text-xs text-gray-400">Loading bills...</div>
          ) : filtered.length === 0 ? (
            <div className="py-14 text-center px-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center mb-3">
                <Receipt size={22} />
              </div>
              <h3 className="text-sm font-semibold text-gray-900">No Expense Receipts Recorded</h3>
              <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1 mb-4">
                {search ? "No bills match your search criteria." : "Upload supplier invoices and receipts to stay organized and claim tax deductions."}
              </p>
              {!search && (
                <button
                  onClick={() => setShowModal(true)}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 shadow-sm"
                >
                  <Plus size={14} className="inline mr-1" /> Upload First Receipt
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 text-gray-500 font-semibold uppercase border-b border-gray-200">
                  <tr>
                    <th className="px-5 py-3">Bill / Ref #</th>
                    <th className="px-5 py-3">Supplier Name</th>
                    <th className="px-5 py-3">Bill Date</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3 text-right">VAT</th>
                    <th className="px-5 py-3 text-right">Grand Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map((bill: any) => (
                    <tr key={bill.id} className="hover:bg-emerald-50/20 transition-colors">
                      <td className="px-5 py-3.5 font-mono font-bold text-gray-900">
                        {bill.billNumber || `REC-${bill.id}`}
                      </td>
                      <td className="px-5 py-3.5 font-semibold text-gray-800">
                        {bill.supplierName || "Direct Supplier"}
                      </td>
                      <td className="px-5 py-3.5 text-gray-500">
                        {bill.billDate ? new Date(bill.billDate).toLocaleDateString("en-GB") : "—"}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
                          <CheckCircle2 size={11} className="text-emerald-600" />
                          Bridged to Practice
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono text-gray-500">
                        £{Number(bill.vatTotal || 0).toFixed(2)}
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono font-bold text-gray-900">
                        £{Number(bill.grandTotal || 0).toFixed(2)}
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
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
                  <Receipt size={17} />
                </div>
                <h3 className="text-base font-bold text-gray-900">Upload Expense Receipt</h3>
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
                uploadReceiptMutation.mutate();
              }}
              className="mt-4 space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Supplier / Vendor Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Adobe, AWS, British Telecom"
                  value={supplier}
                  onChange={(e) => setSupplier(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Gross Amount (£) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
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
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Expense Category / Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Travel, Software license, Office supplies"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
                  disabled={uploadReceiptMutation.isPending}
                  className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm disabled:opacity-50"
                >
                  {uploadReceiptMutation.isPending ? "Uploading..." : "Save & Sync"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </SmeLayout>
  );
}
