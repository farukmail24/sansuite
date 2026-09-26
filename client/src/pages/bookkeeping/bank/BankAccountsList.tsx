import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import AppLayout from "../../../components/layout/AppLayout";
import { apiRequest, queryClient } from "../../../lib/queryClient";
import { useToast } from "../../../hooks/useToast";
import { Wallet, ChevronRight, Plus, RefreshCcw, X, Building, DollarSign, Search } from "lucide-react";
import { getClientSidebar } from "../sidebar";

export default function BankAccountsList() {
  const [match, params] = useRoute("/bookkeeping/:id/bank");
  const [, navigate] = useLocation();
  const clientId = params?.id;
  const { toast } = useToast();

  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [formData, setFormData] = useState({
    bankName: "Barclays Bank",
    accountType: "Current Account",
    currency: "GBP",
    sortCode: "",
    accountNumber: "",
    accountCode: "1200",
    openingBalance: "0.00"
  });

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: [`/api/bookkeeping/bank-accounts/client/${clientId}`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/bookkeeping/bank-accounts/client/${clientId}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!clientId,
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["/api/practice/clients"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/practice/clients");
      if (!res.ok) return [];
      return res.json();
    },
  });

  const client = clients.find((c: any) => String(c.id) === clientId);

  const createAccountMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiRequest("POST", "/api/bookkeeping/bank-accounts", payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/bookkeeping/bank-accounts/client/${clientId}`] });
      setShowModal(false);
      setFormData({
        bankName: "Barclays Bank",
        accountType: "Current Account",
        currency: "GBP",
        sortCode: "",
        accountNumber: "",
        accountCode: "1200",
        openingBalance: "0.00"
      });
      toast({ title: "Bank Account Added", description: "Account successfully created in the bank ledger." });
    },
    onError: (err: any) => {
      toast({ title: "Failed to Add Account", description: err.message || "Failed to create bank account", type: "error" });
    }
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.bankName) {
      toast({ title: "Error", description: "Please enter a bank name", type: "error" });
      return;
    }
    createAccountMutation.mutate({
      clientId: Number(clientId),
      bankName: formData.bankName,
      accountType: formData.accountType,
      currency: formData.currency,
      sortCode: formData.sortCode,
      accountNumber: formData.accountNumber,
      accountCode: formData.accountCode,
      currentBalance: formData.openingBalance
    });
  };

  const filteredAccounts = accounts.filter((acc: any) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      acc.bankName?.toLowerCase().includes(q) ||
      acc.accountName?.toLowerCase().includes(q) ||
      acc.sortCode?.toLowerCase().includes(q) ||
      acc.accountNumber?.toLowerCase().includes(q) ||
      acc.accountType?.toLowerCase().includes(q)
    );
  });

  return (
    <AppLayout sidebar={getClientSidebar(clientId || "")} module="Bookkeeping">
      <div className="bg-gray-50 min-h-screen pb-12">
        <div className="bg-white px-4 py-2 flex items-center justify-between border-b border-gray-200">
          <div className="flex items-center text-sm text-gray-500">
            <button onClick={() => navigate("/bookkeeping")} className="hover:text-purple-600 transition-colors">Bookkeeping</button>
            <ChevronRight size={14} className="mx-1" />
            <button onClick={() => navigate(`/bookkeeping/${clientId}`)} className="hover:text-purple-600 transition-colors">{client?.clientName || 'Client'}</button>
            <ChevronRight size={14} className="mx-1" />
            <span className="text-gray-800 font-medium">Bank Accounts</span>
          </div>
        </div>

        <div className="p-6 w-full mx-auto max-w-7xl">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-semibold text-gray-800">Bank Accounts</h1>
              <p className="text-gray-500 text-sm mt-1">Manage bank accounts, electronic feeds, and reconcile statement lines.</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative w-64">
                <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search accounts or sort code..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-purple-500 outline-none bg-white"
                />
              </div>
              <button
                onClick={() => navigate(`/bookkeeping/${clientId}/cash-coding`)}
                className="px-3.5 py-2 border border-purple-300 text-purple-700 hover:bg-purple-50 rounded-lg text-sm font-medium transition-colors"
              >
                Cash Coding
              </button>
              <button
                onClick={() => navigate(`/bookkeeping/${clientId}/bank-rules`)}
                className="px-3.5 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg text-sm font-medium transition-colors"
              >
                Bank Rules
              </button>
              <button
                onClick={() => setShowModal(true)}
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm transition-colors flex items-center gap-2 text-sm"
              >
                <Plus size={16} /> Add Bank Account
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {isLoading ? (
              <div className="col-span-full text-center py-12 text-gray-500">Loading bank accounts...</div>
            ) : filteredAccounts.length === 0 ? (
              <div className="col-span-full bg-white border border-gray-200 rounded-xl p-12 flex flex-col items-center justify-center shadow-sm">
                <div className="w-16 h-16 bg-purple-50 rounded-full flex items-center justify-center text-purple-600 mb-4">
                  <Wallet size={28} />
                </div>
                <h3 className="text-lg font-semibold text-gray-800 mb-1">No Bank Accounts</h3>
                <p className="text-gray-500 text-center max-w-sm mb-6 text-sm">
                  You haven't added any bank accounts for this client yet. Add an account to record statement entries and reconcile transactions.
                </p>
                <button 
                  onClick={() => setShowModal(true)}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-2.5 rounded-lg font-medium shadow-sm transition-colors text-sm flex items-center gap-2"
                >
                  <Plus size={16} /> Add First Account
                </button>
              </div>
            ) : (
              filteredAccounts.map((acc: any) => (
                <div key={acc.id} className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
                  <div className="p-5 border-b border-gray-100 flex-1">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-semibold text-gray-800 text-lg">{acc.bankName}</h3>
                        <p className="text-sm text-gray-500">{acc.accountType || 'Current Account'}</p>
                      </div>
                      <span className="bg-green-50 text-green-700 px-2.5 py-0.5 rounded text-xs font-semibold border border-green-200">Active</span>
                    </div>
                    <div className="space-y-1 mb-6">
                      {acc.sortCode && <p className="text-sm text-gray-600"><span className="text-gray-400 w-24 inline-block">Sort Code:</span> <span className="font-mono">{acc.sortCode}</span></p>}
                      {acc.accountNumber && <p className="text-sm text-gray-600"><span className="text-gray-400 w-24 inline-block">Account No:</span> <span className="font-mono">{acc.accountNumber}</span></p>}
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wider mb-1 font-medium">Balance in SanSuite</p>
                      <p className="text-3xl font-bold font-mono text-gray-800">
                        {acc.currency === 'GBP' ? '£' : (acc.currency === 'USD' ? '$' : '€')}
                        {parseFloat(acc.currentBalance || 0).toFixed(2)}
                      </p>
                    </div>
                  </div>
                  <div className="bg-gray-50 p-4 border-t border-gray-100 flex gap-3">
                    <button
                      onClick={() => navigate(`/bookkeeping/${clientId}/bank/${acc.id}/reconcile`)}
                      className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-2 rounded-lg font-medium transition-colors text-sm flex items-center justify-center gap-2"
                    >
                      <RefreshCcw size={15} /> Reconcile
                    </button>
                    <button 
                      onClick={() => navigate(`/bookkeeping/${clientId}/bank/${acc.id}/reconcile`)}
                      className="px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg text-sm font-medium transition-colors"
                    >
                      Statements
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b bg-gray-50 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center">
                  <Building size={16} />
                </div>
                <h3 className="font-semibold text-gray-800">Add New Bank Account</h3>
              </div>
              <button onClick={() => setShowModal(false)}><X size={20} className="text-gray-400" /></button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bank Name *</label>
                <input
                  type="text"
                  required
                  value={formData.bankName}
                  onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                  placeholder="e.g. Barclays Bank, Lloyds, NatWest"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Account Type</label>
                  <select
                    value={formData.accountType}
                    onChange={(e) => setFormData({ ...formData, accountType: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 text-sm"
                  >
                    <option value="Current Account">Current Account</option>
                    <option value="Savings Account">Savings Account</option>
                    <option value="Credit Card">Credit Card</option>
                    <option value="Loan Account">Loan Account</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                  <select
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 text-sm"
                  >
                    <option value="GBP">GBP (£)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="USD">USD ($)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sort Code</label>
                  <input
                    type="text"
                    value={formData.sortCode}
                    onChange={(e) => setFormData({ ...formData, sortCode: e.target.value })}
                    placeholder="20-00-00"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Account Number</label>
                  <input
                    type="text"
                    value={formData.accountNumber}
                    onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                    placeholder="12345678"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 text-sm font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t pt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nominal Code</label>
                  <input
                    type="text"
                    value={formData.accountCode}
                    onChange={(e) => setFormData({ ...formData, accountCode: e.target.value })}
                    placeholder="1200"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Opening Balance (£)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.openingBalance}
                    onChange={(e) => setFormData({ ...formData, openingBalance: e.target.value })}
                    placeholder="0.00"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 text-sm font-mono"
                  />
                </div>
              </div>

              <div className="px-6 py-4 -mx-6 -mb-6 mt-6 border-t bg-gray-50 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createAccountMutation.isPending}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg font-medium flex items-center gap-2 disabled:opacity-50"
                >
                  <Plus size={15} /> {createAccountMutation.isPending ? "Creating..." : "Create Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
