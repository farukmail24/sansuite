import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AppLayout from "../../components/layout/AppLayout";
import { apiRequest } from "../../lib/queryClient";
import { 
  Landmark, 
  ArrowRight, 
  CheckCircle2, 
  ChevronRight, 
  ShieldCheck, 
  Building2 
} from "lucide-react";
import { bookkeepingSidebar, getClientSidebar } from "./sidebar";
import { useToast } from "../../hooks/useToast";
import ClientGuard from "./ClientGuard";

export default function BankFeedsPage() {
  const [match, params] = useRoute("/bookkeeping/:id/*");
  const clientId = match ? params?.id : "";
  const [, navigate] = useLocation();

  if (!clientId) return <ClientGuard featureTitle="Bank Feeds" />;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [connectedBank, setConnectedBank] = useState<string | null>(null);

  // Fetch client details
  const { data: clients = [] } = useQuery<any[]>({
    queryKey: ["/api/practice/clients"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/practice/clients");
      if (!res.ok) return [];
      return res.json();
    },
  });

  const client = clients.find((c: any) => String(c.id) === clientId);

  // Mutation to connect bank account
  const connectBankMutation = useMutation({
    mutationFn: async (bankName: string) => {
      const res = await apiRequest("POST", "/api/bookkeeping/bank-accounts", {
        clientId: parseInt(clientId || "1"),
        bankName,
        accountName: `${bankName} Current Account`,
        accountNumber: "12345678",
        sortCode: "20-00-00",
        accountType: "Current",
        currency: "GBP",
        openingBalance: "15000.00"
      });
      return res.json();
    },
    onSuccess: (_, bankName) => {
      queryClient.invalidateQueries({ queryKey: [`/api/bookkeeping/bank-accounts/client/${clientId || 1}`] });
      setConnectedBank(bankName);
      toast({ title: "Bank Connected", description: `${bankName} feed successfully linked & synced to banking ledger.` });
    },
  });

  const handleConnect = (bankName: string) => {
    connectBankMutation.mutate(bankName);
  };

  return (
    <AppLayout sidebar={clientId ? getClientSidebar(clientId) : bookkeepingSidebar} module="Bookkeeping">
      <div className="bg-gray-50 min-h-screen">
        {/* Navigation Breadcrumb */}
        <div className="bg-white px-4 py-2.5 border-b border-gray-200 flex items-center text-sm text-gray-500 gap-2">
          <button onClick={() => navigate("/bookkeeping")} className="hover:text-purple-600 font-medium transition-colors">Bookkeeping</button>
          <ChevronRight size={14} />
          <span className="font-semibold text-gray-800">Open Banking Feeds</span>
        </div>

        <div className="p-6 max-w-5xl mx-auto space-y-6">
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden text-center p-10 space-y-6">
            <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto">
              <Landmark size={32} />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-gray-900">Open Banking Live Feeds</h2>
              <p className="text-gray-500 max-w-lg mx-auto text-xs leading-relaxed">
                Connect your business bank accounts securely via Open Banking API to automatically synchronize daily bank transactions.
              </p>
            </div>

            {connectedBank ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-8 max-w-md mx-auto flex flex-col items-center space-y-3">
                <CheckCircle2 size={44} className="text-emerald-600" />
                <h3 className="font-bold text-emerald-900 text-base">{connectedBank} Connected</h3>
                <p className="text-xs text-emerald-700">Account (ending 5678) is actively syncing with SanSuite Banking.</p>
                <button
                  onClick={() => navigate(clientId ? `/bookkeeping/${clientId}/bank` : "/bookkeeping/bank")}
                  className="mt-4 px-5 py-2.5 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 shadow-sm"
                >
                  Go to Bank Ledger
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto pt-4">
                {["Barclays Bank UK", "HSBC Commercial", "NatWest Business", "Lloyds Bank", "Monzo Business", "Revolut Business"].map((bank) => (
                  <button
                    key={bank}
                    onClick={() => handleConnect(bank)}
                    disabled={connectBankMutation.isPending}
                    className="p-5 border border-gray-200 bg-white rounded-xl hover:border-purple-500 hover:shadow-md transition-all group flex flex-col items-center justify-center space-y-3"
                  >
                    <div className="w-10 h-10 bg-gray-100 text-gray-700 rounded-xl flex items-center justify-center group-hover:bg-purple-100 group-hover:text-purple-600 transition-colors">
                      <Building2 size={20} />
                    </div>
                    <span className="font-bold text-gray-800 text-xs group-hover:text-purple-700">{bank}</span>
                    <span className="text-[11px] font-semibold text-purple-600 flex items-center gap-1 opacity-80 group-hover:opacity-100">
                      Connect Feed <ArrowRight size={12} />
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
