import { useQuery } from "@tanstack/react-query";
import SmeLayout from "../../components/layout/SmeLayout";
import { apiRequest } from "../../lib/queryClient";
import { Landmark, CheckCircle2, Clock, ArrowUpRight, ArrowDownLeft, ShieldCheck } from "lucide-react";

export default function SmeBankPage() {
  const { data: workspace, isLoading } = useQuery({
    queryKey: ["/api/portal/my-workspace"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/portal/my-workspace");
      if (!res.ok) throw new Error("Failed to load bank data");
      return res.json();
    },
  });

  const bankAccounts = workspace?.bankAccounts || [];

  return (
    <SmeLayout module="Bank Accounts">
      <div className="space-y-6">
        {/* Header Strip */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Landmark size={22} className="text-purple-600" />
              Connected Bank Accounts
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Live Open Banking feeds configured and reconciled in partnership with your accountant.
            </p>
          </div>
        </div>

        {/* Bank List */}
        {isLoading ? (
          <div className="py-12 text-center text-xs text-gray-400">Loading bank accounts...</div>
        ) : bankAccounts.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center shadow-sm">
            <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 mx-auto flex items-center justify-center mb-3">
              <Landmark size={24} />
            </div>
            <h3 className="text-sm font-semibold text-gray-900">No Bank Accounts Linked</h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1 mb-4">
              Your accountant can link your business bank feeds or upload statements for automated reconciliations.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {bankAccounts.map((acc: any) => (
              <div
                key={acc.id}
                className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-sm">
                      <Landmark size={20} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-gray-900">{acc.accountName || "Business Account"}</h4>
                      <p className="text-xs text-gray-500 font-mono">
                        {acc.accountNumber ? `•••• ${acc.accountNumber.slice(-4)}` : "Open Banking"}
                      </p>
                    </div>
                  </div>
                  <span className="px-2.5 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 rounded-full border border-emerald-200 flex items-center gap-1">
                    <CheckCircle2 size={11} className="text-emerald-600" />
                    Live Feed
                  </span>
                </div>

                <div className="mt-5 pt-4 border-t border-gray-100 flex items-baseline justify-between">
                  <div>
                    <span className="text-xs text-gray-500">Current Balance</span>
                    <p className="text-xs text-emerald-600 font-medium">Reconciled with Accountant</p>
                  </div>
                  <span className="text-2xl font-black text-gray-900 font-mono">
                    £{Number(acc.currentBalance || 0).toLocaleString("en-GB", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </SmeLayout>
  );
}
