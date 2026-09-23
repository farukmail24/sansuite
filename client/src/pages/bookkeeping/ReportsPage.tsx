import { useRoute } from "wouter";
import AppLayout from "../../components/layout/AppLayout";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "../../lib/queryClient";
import { LayoutDashboard, BarChart2, Settings, FileDown, TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import { bookkeepingSidebar, getClientSidebar } from "./sidebar";
import ClientGuard from "./ClientGuard";



// Dynamic P&L data is fetched from /api/bookkeeping/reports/:clientId/profit-loss

export default function ReportsPage() {
  const [match1, params1] = useRoute("/bookkeeping/:id/reports");
  const [match2, params2] = useRoute("/bookkeeping/:id/*");
  const clientId = match1 ? params1.id : (match2 ? params2.id : "");

  if (!clientId) return <ClientGuard featureTitle="Reports" />;

  const { data: plData = [] } = useQuery({
    queryKey: ["/api/bookkeeping/reports", clientId, "profit-loss"],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/bookkeeping/reports/${clientId}/profit-loss`);
      if (!res.ok) return [];
      const data = await res.json();
      return data.plData || [];
    },
    enabled: !!clientId
  });

  const totalIncome = plData.filter((r: any) => r.type === "income").reduce((s: number, r: any) => s + r.amount, 0);
  const totalExpenses = plData.filter((r: any) => r.type === "expense").reduce((s: number, r: any) => s + r.amount, 0);
  const netProfit = totalIncome - totalExpenses;

  return (
    <AppLayout sidebar={clientId ? getClientSidebar(clientId) : bookkeepingSidebar} module="Bookkeeping">
      <div className="p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-xs text-gray-400">Home / Bookkeeping / Reports</p>
            <h1 className="text-lg font-bold text-gray-800 mt-0.5">Profit & Loss Report</h1>
          </div>
          <div className="flex gap-2">
            <select className="text-sm border border-gray-200 rounded-lg px-3 py-2">
              <option>2025/2026</option>
              <option>2024/2025</option>
            </select>
            <button className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 flex items-center gap-2 hover:bg-gray-50">
              <FileDown size={14} /> Export
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-5 mb-6">
          <div className="SanSuite-card p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-green-50">
                <TrendingUp size={18} className="text-green-600" />
              </div>
              <div>
                <p className="text-xs text-gray-400">Total Income</p>
                <p className="text-xl font-bold text-green-600">£{totalIncome.toLocaleString("en-GB", { minimumFractionDigits: 2 })}</p>
              </div>
            </div>
          </div>
          <div className="SanSuite-card p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-red-50">
                <TrendingDown size={18} className="text-red-500" />
              </div>
              <div>
                <p className="text-xs text-gray-400">Total Expenses</p>
                <p className="text-xl font-bold text-red-600">£{totalExpenses.toLocaleString("en-GB", { minimumFractionDigits: 2 })}</p>
              </div>
            </div>
          </div>
          <div className="SanSuite-card p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "#6c5ce720" }}>
                <DollarSign size={18} style={{ color: "#6c5ce7" }} />
              </div>
              <div>
                <p className="text-xs text-gray-400">Net Profit</p>
                <p className="text-xl font-bold" style={{ color: "#6c5ce7" }}>
                  £{netProfit.toLocaleString("en-GB", { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* P&L Table */}
        <div className="SanSuite-card overflow-hidden">
          <div className="px-5 py-3 bg-gray-50 border-b">
            <h3 className="font-semibold text-sm text-gray-700">Income</h3>
          </div>
          <table className="SanSuite-table">
            <thead><tr><th>Account</th><th>Amount</th></tr></thead>
            <tbody>
              {plData.filter((r: any) => r.type === "income").map((row: any) => (
                <tr key={row.label}>
                  <td>{row.label}</td>
                  <td className="text-green-600 font-medium">£{row.amount.toFixed(2)}</td>
                </tr>
              ))}
              <tr className="bg-green-50 font-bold">
                <td>Total Income</td>
                <td className="text-green-700">£{totalIncome.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>

          <div className="px-5 py-3 bg-gray-50 border-b border-t">
            <h3 className="font-semibold text-sm text-gray-700">Expenses</h3>
          </div>
          <table className="SanSuite-table">
            <tbody>
              {plData.filter((r: any) => r.type === "expense").map((row: any) => (
                <tr key={row.label}>
                  <td>{row.label}</td>
                  <td className="text-red-600 font-medium">£{row.amount.toFixed(2)}</td>
                </tr>
              ))}
              <tr className="bg-red-50 font-bold">
                <td>Total Expenses</td>
                <td className="text-red-700">£{totalExpenses.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>

          <div className="px-5 py-4 border-t" style={{ background: "#6c5ce710" }}>
            <div className="flex justify-between items-center">
              <span className="font-bold text-gray-800">Net Profit / (Loss)</span>
              <span className="font-bold text-lg" style={{ color: "#6c5ce7" }}>£{netProfit.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
