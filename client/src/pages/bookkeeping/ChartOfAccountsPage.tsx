import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AppLayout from "../../components/layout/AppLayout";
import { List, Plus, Search, CheckSquare, Briefcase, FileText, X } from "lucide-react";
import { apiRequest } from "../../lib/queryClient";
import { useToast } from "../../hooks/useToast";
import { getClientSidebar, bookkeepingSidebar } from "./sidebar";
import { useRoute, useLocation } from "wouter";
import ClientGuard from "./ClientGuard";

export default function ChartOfAccountsPage() {
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [match, params] = useRoute("/bookkeeping/:id/*");
  const clientId = match ? params?.id : "";
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    nominalCode: "", name: "", category: "Sales"
  });

  if (!clientId) return <ClientGuard featureTitle="Chart of Accounts" />;

  const { data: clients = [] } = useQuery({
    queryKey: ["/api/practice/clients"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/practice/clients");
      if (!res.ok) return [];
      return res.json();
    }
  });

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: [`/api/bookkeeping/coa/${clientId}`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/bookkeeping/coa/${clientId}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!clientId,
  });

  const addAccount = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/bookkeeping/coa", { ...form, clientId });
      if (!res.ok) throw new Error("Failed to add account");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Account Added", type: "success" });
      qc.invalidateQueries({ queryKey: [`/api/bookkeeping/coa/${clientId}`] });
      setShowModal(false);
      setForm({ nominalCode: "", name: "", category: "Sales" });
    },
    onError: (e) => toast({ title: "Error", description: e.message, type: "error" })
  });

  const filtered = accounts.filter((a: any) =>
    a.name.toLowerCase().includes(search.toLowerCase()) ||
    a.nominalCode.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AppLayout sidebar={getClientSidebar(clientId)} module="Bookkeeping">
      <div className="p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-xl font-bold text-gray-800">Chart of Accounts</h1>
            <p className="text-sm text-gray-500">Manage nominal codes and tax rates for clients</p>
          </div>
          <button
            disabled={!clientId}
            onClick={() => setShowModal(true)}
            className="btn-SanSuite flex items-center gap-2"
          >
            <Plus size={15} /> Add Account
          </button>
        </div>

        <div className="SanSuite-card p-5 mb-6 bg-purple-50/50 border border-purple-100">
          <label className="block text-xs font-semibold text-purple-900 mb-1">Select Client</label>
          <select
            value={clientId}
            onChange={(e) => navigate(`/bookkeeping/${e.target.value}/coa`)}
            className="w-full md:w-1/3 text-sm border border-purple-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-purple-400"
          >
            <option value="">Select a client to view their Chart of Accounts...</option>
            {clients.map((c: any) => (
              <option key={c.id} value={c.id}>{c.clientName} ({c.clientCode})</option>
            ))}
          </select>
        </div>

        <div className="SanSuite-card overflow-hidden">
          <div className="px-5 py-4 border-b bg-gray-50 flex items-center justify-between">
            <h3 className="font-semibold text-sm text-gray-700">Nominal Codes</h3>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search accounts..."
                className="w-64 pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-purple-400"
              />
            </div>
          </div>

          <table className="SanSuite-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Name</th>
                <th>Category</th>
                <th>System Account</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {!clientId ? (
                <tr><td colSpan={5} className="text-center py-8 text-gray-400 text-sm">Please select a client first.</td></tr>
              ) : isLoading ? (
                <tr><td colSpan={5} className="text-center py-8 text-gray-400 text-sm">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-8 text-gray-400 text-sm">No accounts found.</td></tr>
              ) : (
                filtered.map((a: any) => (
                  <tr key={a.id}>
                    <td className="font-medium">{a.nominalCode}</td>
                    <td>{a.name}</td>
                    <td><span className="badge-info">{a.category}</span></td>
                    <td>
                      {a.isSystem ? <span className="text-xs text-gray-400">Yes</span> : <span className="text-xs text-green-600">No (Custom)</span>}
                    </td>
                    <td>
                      {!a.isSystem && (
                        <button className="text-xs text-purple-600 hover:underline">Edit</button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h2 className="font-bold text-gray-800">Add New Account</h2>
              <button onClick={() => setShowModal(false)}><X size={18} className="text-gray-400" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Nominal Code *</label>
                  <input value={form.nominalCode} onChange={e => setForm({ ...form, nominalCode: e.target.value })}
                    placeholder="e.g. 4000"
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:ring-1 focus:ring-purple-400 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Category</label>
                  <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2">
                    {["Sales", "Purchases", "Direct Expenses", "Overheads", "Current Asset", "Fixed Asset", "Liability", "Equity"].map(t => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Account Name *</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Sales Income"
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:ring-1 focus:ring-purple-400 focus:outline-none" />
              </div>
            </div>
            <div className="px-6 py-4 border-t bg-gray-50 rounded-b-xl flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-100">Cancel</button>
              <button onClick={() => addAccount.mutate()} disabled={!form.nominalCode || !form.name || addAccount.isPending}
                className="btn-SanSuite">
                {addAccount.isPending ? "Saving..." : "Save Account"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
