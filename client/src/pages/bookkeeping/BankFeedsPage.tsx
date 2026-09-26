import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AppLayout from "../../components/layout/AppLayout";
import { apiRequest } from "../../lib/queryClient";
import {
  Landmark, ArrowRight, CheckCircle2, ChevronRight,
  Building2, Plus, Trash2, RefreshCw, AlertCircle, X, Save
} from "lucide-react";
import { bookkeepingSidebar, getClientSidebar } from "./sidebar";
import { useToast } from "../../hooks/useToast";
import ClientGuard from "./ClientGuard";

const UK_BANK_OPTIONS = [
  "Barclays Bank UK",
  "HSBC Commercial",
  "NatWest Business",
  "Lloyds Bank",
  "Santander Business",
  "Metro Bank",
  "Starling Bank",
  "Monzo Business",
  "Revolut Business",
  "Co-operative Bank",
  "TSB Business",
  "Virgin Money",
  "Allied Irish Bank",
  "Bank of Ireland",
  "Clydesdale Bank",
  "Other",
];

interface BankFormState {
  bankName: string;
  accountName: string;
  accountNumber: string;
  sortCode: string;
  accountType: string;
  currency: string;
  openingBalance: string;
}

export default function BankFeedsPage() {
  const [match, params] = useRoute("/bookkeeping/:id/*");
  const clientId = match ? params?.id : "";
  const [, navigate] = useLocation();

  if (!clientId) return <ClientGuard featureTitle="Bank Feeds" />;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState<BankFormState>({
    bankName: "",
    accountName: "",
    accountNumber: "",
    sortCode: "",
    accountType: "Current",
    currency: "GBP",
    openingBalance: "",
  });
  const [formErrors, setFormErrors] = useState<Partial<BankFormState>>({});

  // Fetch existing bank accounts
  const { data: bankAccounts = [], isLoading } = useQuery<any[]>({
    queryKey: [`/api/bookkeeping/bank-accounts/client/${clientId}`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/bookkeeping/bank-accounts/client/${clientId}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!clientId,
  });

  const validateForm = (): boolean => {
    const errors: Partial<BankFormState> = {};
    if (!form.bankName) errors.bankName = "Bank name is required";
    if (!form.accountName) errors.accountName = "Account name is required";
    if (!form.accountNumber || form.accountNumber.length < 6) errors.accountNumber = "Enter a valid account number (min 6 digits)";
    if (!form.sortCode || !/^\d{2}-\d{2}-\d{2}$/.test(form.sortCode)) errors.sortCode = "Enter sort code as XX-XX-XX";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const connectMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/bookkeeping/bank-accounts", {
        clientId: parseInt(clientId || "1"),
        bankName: form.bankName,
        accountName: form.accountName,
        accountNumber: form.accountNumber,
        sortCode: form.sortCode,
        accountType: form.accountType,
        currency: form.currency,
        openingBalance: form.openingBalance || "0.00",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to connect bank account");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/bookkeeping/bank-accounts/client/${clientId}`] });
      toast({ title: "Bank Account Connected", description: `${form.bankName} – ${form.accountName} has been linked to the banking ledger.` });
      setShowAddForm(false);
      setForm({ bankName: "", accountName: "", accountNumber: "", sortCode: "", accountType: "Current", currency: "GBP", openingBalance: "" });
    },
    onError: (e: any) => toast({ title: "Connection Failed", description: e.message, type: "error" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/bookkeeping/bank-accounts/${id}`);
      if (!res.ok) throw new Error("Failed to delete");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/bookkeeping/bank-accounts/client/${clientId}`] });
      toast({ title: "Bank Removed", description: "The bank account has been disconnected." });
    },
    onError: () => toast({ title: "Error", description: "Could not remove bank account.", type: "error" }),
  });

  const handleSubmit = () => {
    if (validateForm()) connectMutation.mutate();
  };

  const formatSortCode = (raw: string) => {
    const digits = raw.replace(/\D/g, "").slice(0, 6);
    const parts = [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 6)].filter(Boolean);
    return parts.join("-");
  };

  return (
    <AppLayout sidebar={clientId ? getClientSidebar(clientId) : bookkeepingSidebar} module="Bookkeeping">
      <div className="bg-gray-50 min-h-screen">
        <div className="bg-white px-4 py-2.5 border-b border-gray-200 flex items-center justify-between text-sm">
          <div className="flex items-center text-gray-500 gap-2">
            <button onClick={() => navigate("/bookkeeping")} className="hover:text-purple-600 font-medium">Bookkeeping</button>
            <ChevronRight size={14} />
            <span className="font-semibold text-gray-800">Open Banking Feeds</span>
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 px-4 py-1.5 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700"
          >
            <Plus size={14} /> Connect Bank Account
          </button>
        </div>

        <div className="p-6 max-w-5xl mx-auto space-y-6">
          {/* Header Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle size={18} className="text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-800">
              <p className="font-semibold mb-0.5">Open Banking Integration</p>
              <p className="text-blue-700 leading-relaxed">
                Connect your client's business bank accounts to automatically synchronise daily transactions.
                Enter the actual account details provided by your client — bank transactions will be imported directly into the banking ledger.
              </p>
            </div>
          </div>

          {/* Connected Accounts */}
          {isLoading ? (
            <div className="flex items-center gap-2 text-gray-400 text-sm py-4"><RefreshCw size={14} className="animate-spin" /> Loading bank accounts...</div>
          ) : bankAccounts.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-xl p-12 text-center shadow-sm">
              <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Landmark size={32} />
              </div>
              <h2 className="text-xl font-bold text-gray-800 mb-2">No Bank Accounts Connected</h2>
              <p className="text-gray-500 text-sm max-w-md mx-auto mb-6 leading-relaxed">
                Connect your client's bank account to begin importing and reconciling bank transactions automatically.
              </p>
              <button
                onClick={() => setShowAddForm(true)}
                className="px-5 py-2.5 bg-purple-600 text-white rounded-lg text-sm font-semibold hover:bg-purple-700 flex items-center gap-2 mx-auto"
              >
                <Plus size={14} /> Connect First Bank Account
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-700">Connected Bank Accounts ({bankAccounts.length})</h3>
              {bankAccounts.map((account: any) => (
                <div key={account.id} className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between shadow-sm hover:border-purple-300 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-emerald-100 text-emerald-700 rounded-xl flex items-center justify-center">
                      <Building2 size={20} />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800 text-sm">{account.accountName}</p>
                      <p className="text-xs text-gray-500">{account.bankName} · Sort: {account.sortCode || "—"} · Acc: •••• {String(account.accountNumber || "").slice(-4)}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="px-2 py-0.5 text-xs bg-emerald-100 text-emerald-700 rounded-full font-medium flex items-center gap-1">
                          <CheckCircle2 size={10} /> Active Feed
                        </span>
                        <span className="text-xs text-gray-400">{account.accountType || "Current"} · {account.currency || "GBP"}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => navigate(`/bookkeeping/${clientId}/bank`)}
                      className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 font-medium flex items-center gap-1"
                    >
                      View Ledger <ArrowRight size={12} />
                    </button>
                    <button
                      onClick={() => { if (confirm("Remove this bank account?")) deleteMutation.mutate(account.id); }}
                      className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add Bank Account Modal */}
        {showAddForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl">
              <div className="flex items-center justify-between p-5 border-b">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center">
                    <Landmark size={18} />
                  </div>
                  <h3 className="font-bold text-gray-900">Connect Bank Account</h3>
                </div>
                <button onClick={() => setShowAddForm(false)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                  <X size={16} />
                </button>
              </div>

              <div className="p-5 space-y-4">
                {/* Bank Name */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Bank Name *</label>
                    <select
                      value={form.bankName}
                      onChange={(e) => setForm({ ...form, bankName: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-purple-500 ${formErrors.bankName ? "border-red-400" : "border-gray-300"}`}
                    >
                      <option value="">Select Bank...</option>
                      {UK_BANK_OPTIONS.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                    {formErrors.bankName && <p className="text-red-500 text-xs mt-1">{formErrors.bankName}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Account Type *</label>
                    <select
                      value={form.accountType}
                      onChange={(e) => setForm({ ...form, accountType: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="Current">Current Account</option>
                      <option value="Savings">Savings Account</option>
                      <option value="Loan">Loan Account</option>
                      <option value="Credit">Credit Card</option>
                    </select>
                  </div>
                </div>

                {/* Account Name */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Account Name *</label>
                  <input
                    type="text"
                    value={form.accountName}
                    onChange={(e) => setForm({ ...form, accountName: e.target.value })}
                    placeholder="e.g. Business Current Account"
                    className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-purple-500 ${formErrors.accountName ? "border-red-400" : "border-gray-300"}`}
                  />
                  {formErrors.accountName && <p className="text-red-500 text-xs mt-1">{formErrors.accountName}</p>}
                </div>

                {/* Account Number & Sort Code */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Account Number *</label>
                    <input
                      type="text"
                      value={form.accountNumber}
                      onChange={(e) => setForm({ ...form, accountNumber: e.target.value.replace(/\D/g, "").slice(0, 8) })}
                      placeholder="e.g. 87654321"
                      className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-purple-500 ${formErrors.accountNumber ? "border-red-400" : "border-gray-300"}`}
                    />
                    {formErrors.accountNumber && <p className="text-red-500 text-xs mt-1">{formErrors.accountNumber}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Sort Code * (XX-XX-XX)</label>
                    <input
                      type="text"
                      value={form.sortCode}
                      onChange={(e) => setForm({ ...form, sortCode: formatSortCode(e.target.value) })}
                      placeholder="e.g. 20-45-91"
                      maxLength={8}
                      className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-purple-500 ${formErrors.sortCode ? "border-red-400" : "border-gray-300"}`}
                    />
                    {formErrors.sortCode && <p className="text-red-500 text-xs mt-1">{formErrors.sortCode}</p>}
                  </div>
                </div>

                {/* Currency & Opening Balance */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Currency</label>
                    <select
                      value={form.currency}
                      onChange={(e) => setForm({ ...form, currency: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="GBP">GBP – British Pound</option>
                      <option value="EUR">EUR – Euro</option>
                      <option value="USD">USD – US Dollar</option>
                      <option value="CAD">CAD – Canadian Dollar</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Opening Balance (£)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={form.openingBalance}
                      onChange={(e) => setForm({ ...form, openingBalance: e.target.value })}
                      placeholder="0.00"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 p-5 border-t bg-gray-50 rounded-b-2xl">
                <button onClick={() => setShowAddForm(false)} className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 hover:bg-gray-100">
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={connectMutation.isPending}
                  className="px-4 py-2 bg-purple-600 text-white text-sm font-semibold rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2"
                >
                  <Save size={14} />
                  {connectMutation.isPending ? "Connecting..." : "Connect Account"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
