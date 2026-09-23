import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AppLayout from "../../components/layout/AppLayout";
import { LayoutDashboard, FileText, ShoppingCart, Wallet, Users, BarChart2, Settings, Plus, X } from "lucide-react";
import { apiRequest } from "../../lib/queryClient";
import { bookkeepingSidebar } from "./sidebar";



interface BankAccount {
  id: number;
  bankName: string;
  accountType: string;
  currency: string;
  accountCode: string;
  sortCode: string;
  accountNumber: string;
  currentBalance: string;
  isActive: boolean;
}

export default function BankPage() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    bankName: "", accountType: "Current", currency: "GBP",
    sortCode: "", accountNumber: "", isActive: true,
  });

  const { data: accounts = [], isLoading } = useQuery<BankAccount[]>({
    queryKey: ["/api/bookkeeping/bank-accounts"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/bookkeeping/bank-accounts");
      if (!res.ok) return [];
      return res.json();
    },
  });

  const createAccount = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/bookkeeping/bank-accounts", data);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/bookkeeping/bank-accounts"] }); setShowModal(false); },
  });

  const active = accounts.filter((a) => a.isActive);
  const inactive = accounts.filter((a) => !a.isActive);

  return (
    <AppLayout sidebar={bookkeepingSidebar} module="Bookkeeping">
      <div className="p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400">Home / Bookkeeping / Bank</p>
            <h1 className="text-lg font-bold text-gray-800 mt-0.5">Bank Dashboard</h1>
          </div>
          <button onClick={() => setShowModal(true)} className="btn-SanSuite flex items-center gap-2">
            <Plus size={14} /> Bank Account
          </button>
        </div>

        {/* Active Banks */}
        <div className="SanSuite-card">
          <div className="px-4 py-3 border-b bg-gray-50 flex items-center gap-2">
            <Wallet size={14} className="text-purple-600" />
            <h3 className="font-semibold text-sm text-gray-700">Active Bank</h3>
          </div>
          <table className="SanSuite-table">
            <thead>
              <tr><th>Account Name</th><th>Account No.</th><th>Code</th><th>Type</th><th>Currency</th><th>Balance</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {isLoading ? <tr><td colSpan={7} className="text-center py-6 text-gray-400">Loading...</td></tr> :
                active.length === 0 ? <tr><td colSpan={7} className="text-center py-6 text-gray-400 text-xs">No active bank accounts. Click + Bank Account to add.</td></tr> :
                  active.map((a) => (
                    <tr key={a.id}>
                      <td className="font-medium">{a.bankName}</td>
                      <td className="text-xs">{a.accountNumber || "—"}</td>
                      <td className="text-xs">{a.accountCode || "—"}</td>
                      <td className="text-xs">{a.accountType}</td>
                      <td className="text-xs">{a.currency}</td>
                      <td className="font-semibold">£{parseFloat(a.currentBalance || "0").toFixed(2)}</td>
                      <td className="space-x-2">
                        <button className="text-xs text-purple-600 hover:underline">Reconcile</button>
                        <button className="text-xs text-gray-400 hover:underline">Upload Statement</button>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>

        {/* Cash in Hand */}
        <div className="SanSuite-card p-4">
          <h3 className="font-semibold text-sm text-gray-700 mb-2">Cash In Hand</h3>
          <p className="text-2xl font-bold" style={{ color: "#6c5ce7" }}>£0.00</p>
        </div>

        {/* Inactive banks */}
        {inactive.length > 0 && (
          <div className="SanSuite-card">
            <div className="px-4 py-3 border-b bg-gray-50">
              <h3 className="font-semibold text-sm text-gray-500">In-Active Bank</h3>
            </div>
            <table className="SanSuite-table">
              <thead><tr><th>Account Name</th><th>Type</th><th>Currency</th><th>Balance</th></tr></thead>
              <tbody>
                {inactive.map((a) => (
                  <tr key={a.id}>
                    <td className="text-gray-400">{a.bankName}</td>
                    <td className="text-xs text-gray-400">{a.accountType}</td>
                    <td className="text-xs text-gray-400">{a.currency}</td>
                    <td className="text-gray-400">£{parseFloat(a.currentBalance || "0").toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Bank Account Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="font-bold text-gray-800">Add Bank Account</h2>
              <button onClick={() => setShowModal(false)}><X size={18} className="text-gray-400" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Bank Name</label>
                <input value={form.bankName} onChange={(e) => setForm((f) => ({ ...f, bankName: e.target.value }))}
                  placeholder="e.g. Barclays Business" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Account Type</label>
                  <select value={form.accountType} onChange={(e) => setForm((f) => ({ ...f, accountType: e.target.value }))}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2">
                    {["Current", "Savings", "Credit Card", "Loan", "PayPal"].map((t) => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Currency</label>
                  <select value={form.currency} onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2">
                    <option>GBP</option><option>USD</option><option>EUR</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Sort Code</label>
                  <input value={form.sortCode} onChange={(e) => setForm((f) => ({ ...f, sortCode: e.target.value }))}
                    placeholder="00-00-00" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Account Number</label>
                  <input value={form.accountNumber} onChange={(e) => setForm((f) => ({ ...f, accountNumber: e.target.value }))}
                    placeholder="12345678" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="isActive" checked={form.isActive}
                  onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))} className="rounded" />
                <label htmlFor="isActive" className="text-xs text-gray-600">Active</label>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-5 py-4 border-t bg-gray-50 rounded-b-xl">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-600">Cancel</button>
              <button onClick={() => createAccount.mutate(form)} disabled={!form.bankName || createAccount.isPending} className="btn-SanSuite">
                {createAccount.isPending ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
