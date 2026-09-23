import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import AppLayout from "../../components/layout/AppLayout";
import { apiRequest, queryClient } from "../../lib/queryClient";
import { useToast } from "../../hooks/useToast";
import { Save, ArrowRightLeft } from "lucide-react";
import { bookkeepingSidebar, getClientSidebar } from "./sidebar";
import ClientGuard from "./ClientGuard";

export default function BankTransferPage() {
  const [match, params] = useRoute("/bookkeeping/:id/bank-transfer");
  const clientId = match ? params.id : "";
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    fromAccountId: "",
    toAccountId: "",
    transferDate: new Date().toISOString().split("T")[0],
    amount: "",
    reference: ""
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["/api/practice/clients"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/practice/clients");
      return res.json();
    },
  });
  const client = clients.find((c: any) => String(c.id) === clientId);

  const { data: bankAccounts = [], isLoading } = useQuery({
    queryKey: ["/api/bookkeeping/bank-accounts/client", clientId],
    queryFn: async () => {
      if (!clientId) return [];
      const res = await apiRequest("GET", `/api/bookkeeping/bank-accounts/client/${clientId}`);
      return res.json();
    },
    enabled: !!clientId
  });

  const recordTransfer = useMutation({
    mutationFn: async () => {
      if (formData.fromAccountId === formData.toAccountId) {
        throw new Error("Cannot transfer to the same account.");
      }
      if (!formData.amount || parseFloat(formData.amount) <= 0) {
        throw new Error("Please enter a valid amount.");
      }

      // 1. Debit the 'From' account (Money Out) -> Credit column
      await apiRequest("POST", `/api/bookkeeping/bank-accounts/${formData.fromAccountId}/transactions`, {
        clientId,
        transactionDate: formData.transferDate,
        description: `Transfer to ${bankAccounts.find((a:any) => a.id == formData.toAccountId)?.bankName} - Ref: ${formData.reference}`,
        credit: formData.amount
      });

      // 2. Credit the 'To' account (Money In) -> Debit column
      await apiRequest("POST", `/api/bookkeeping/bank-accounts/${formData.toAccountId}/transactions`, {
        clientId,
        transactionDate: formData.transferDate,
        description: `Transfer from ${bankAccounts.find((a:any) => a.id == formData.fromAccountId)?.bankName} - Ref: ${formData.reference}`,
        debit: formData.amount
      });
      
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookkeeping/bank-accounts/client", clientId] });
      toast({ title: "Transfer Recorded", description: "The bank transfer has been successfully logged." });
      navigate(`/bookkeeping/${clientId}/banking`);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, type: "error" })
  });

  if (!clientId) {
    return <ClientGuard featureTitle="Bank Transfer" />;
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
            <span className="text-gray-800">Bank Transfer</span>
          </div>
        </div>

        <div className="p-6 max-w-2xl mx-auto space-y-6">
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-teal-100 text-teal-600 rounded-lg flex items-center justify-center">
                <ArrowRightLeft size={20} />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-800">Record Bank Transfer</h2>
                <p className="text-sm text-gray-500">Move funds between two internal bank accounts.</p>
              </div>
            </div>

            {isLoading ? (
              <div className="text-center py-8 text-gray-400">Loading accounts...</div>
            ) : bankAccounts.length < 2 ? (
              <div className="text-center py-8 text-gray-500">
                You need at least 2 bank accounts to record a transfer. <br/>
                <button onClick={() => navigate(`/bookkeeping/${clientId}/banking`)} className="text-purple-600 hover:underline mt-2">Go to Banking Dashboard to add an account</button>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Transfer From (Money Out) *</label>
                    <select value={formData.fromAccountId} onChange={(e) => setFormData({ ...formData, fromAccountId: e.target.value })} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500">
                      <option value="">Select Account</option>
                      {bankAccounts.map((a: any) => (
                        <option key={a.id} value={a.id}>{a.bankName} {a.accountNumber ? `(${a.accountNumber})` : ''} - £{a.currentBalance}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Transfer To (Money In) *</label>
                    <select value={formData.toAccountId} onChange={(e) => setFormData({ ...formData, toAccountId: e.target.value })} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500">
                      <option value="">Select Account</option>
                      {bankAccounts.map((a: any) => (
                        <option key={a.id} value={a.id}>{a.bankName} {a.accountNumber ? `(${a.accountNumber})` : ''}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                    <input type="date" value={formData.transferDate} onChange={(e) => setFormData({ ...formData, transferDate: e.target.value })} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Amount (£) *</label>
                    <input type="number" step="0.01" min="0" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reference / Notes</label>
                  <input type="text" value={formData.reference} onChange={(e) => setFormData({ ...formData, reference: e.target.value })} placeholder="Optional description" className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500" />
                </div>

                <div className="pt-4 border-t flex justify-end">
                  <button 
                    onClick={() => recordTransfer.mutate()} 
                    disabled={recordTransfer.isPending || !formData.fromAccountId || !formData.toAccountId || !formData.amount} 
                    className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50"
                  >
                    <Save size={16} /> {recordTransfer.isPending ? "Recording..." : "Record Transfer"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
