import { useRoute, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import AppLayout from "../../components/layout/AppLayout";
import { apiRequest } from "../../lib/queryClient";
import { TrendingDown, AlertTriangle, FileText, Download, Wallet } from "lucide-react";
import { bookkeepingSidebar, getClientSidebar } from "./sidebar";
import ClientGuard from "./ClientGuard";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function PurchaseDashboardPage() {
  const [match1, params1] = useRoute("/bookkeeping/:id/purchase");
  const [match2, params2] = useRoute("/bookkeeping/:id/purchase-dashboard");
  const clientId = match1 ? params1.id : (match2 ? params2.id : "");
  const [, navigate] = useLocation();

  if (!clientId) {
    return <ClientGuard featureTitle="Purchase Dashboard" />;
  }

  const { data: clients = [] } = useQuery({
    queryKey: ["/api/practice/clients"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/practice/clients");
      return res.json();
    },
  });
  const client = clients.find((c: any) => String(c.id) === clientId);

  const { data: purchases = [], isLoading } = useQuery({
    queryKey: ["/api/bookkeeping/purchases/client", clientId],
    queryFn: async () => {
      if (!clientId) return [];
      const res = await apiRequest("GET", `/api/bookkeeping/purchases/client/${clientId}`);
      return res.json();
    },
    enabled: !!clientId
  });

  // Calculate Metrics
  const totalPurchases = purchases.reduce((sum: number, p: any) => sum + parseFloat(p.grandTotal || "0"), 0);
  const totalPaid = purchases.reduce((sum: number, p: any) => {
    // If we only have full Paid status for purchases, it's either 0 or grandTotal
    return sum + (p.status === "Paid" ? parseFloat(p.grandTotal || "0") : 0);
  }, 0);
  const totalOutstanding = totalPurchases - totalPaid;

  const overduePurchases = purchases.filter((p: any) => {
    if (p.status === "Paid" || !p.dueDate) return false;
    return new Date(p.dueDate) < new Date();
  });
  const totalOverdue = overduePurchases.reduce((sum: number, p: any) => sum + parseFloat(p.grandTotal || "0"), 0);

  // Group by month for chart
  const monthlyData: Record<string, { month: string, expenses: number, paid: number }> = {};
  purchases.forEach((p: any) => {
    const d = new Date(p.billDate);
    const month = d.toLocaleString('default', { month: 'short' });
    if (!monthlyData[month]) monthlyData[month] = { month, expenses: 0, paid: 0 };
    monthlyData[month].expenses += parseFloat(p.grandTotal);
    monthlyData[month].paid += (p.status === "Paid" ? parseFloat(p.grandTotal) : 0);
  });
  const chartData = Object.values(monthlyData);

  return (
    <AppLayout sidebar={clientId ? getClientSidebar(clientId) : bookkeepingSidebar} module="Bookkeeping">
      <div className="bg-gray-50 min-h-screen pb-10">
        <div className="bg-white px-4 py-2 border-b border-gray-200 flex items-center justify-between mb-6">
          <div className="flex items-center text-sm text-gray-500 gap-2">
            <button onClick={() => navigate("/bookkeeping")} className="hover:text-purple-600">Bookkeeping</button>
            <span>/</span>
            <span className="font-medium text-gray-800">{client?.clientName || "Client"}</span>
            <span>/</span>
            <span className="text-gray-800">Purchase Dashboard</span>
          </div>
          <button className="text-gray-500 hover:text-purple-600 flex items-center gap-1 text-sm font-medium">
            <Download size={14} /> Export Report
          </button>
        </div>

        <div className="w-full mx-auto px-6 space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
              <div className="flex items-center gap-3 mb-2 text-gray-500">
                <Wallet size={16} className="text-orange-500" />
                <span className="text-sm font-medium">Total Expenses (YTD)</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-800">£{totalPurchases.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h3>
            </div>

            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
              <div className="flex items-center gap-3 mb-2 text-gray-500">
                <TrendingDown size={16} className="text-blue-500" />
                <span className="text-sm font-medium">Total Paid Out</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-800">£{totalPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h3>
            </div>

            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
              <div className="flex items-center gap-3 mb-2 text-gray-500">
                <FileText size={16} className="text-purple-500" />
                <span className="text-sm font-medium">Outstanding Payables</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-800">£{totalOutstanding.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h3>
            </div>

            <div className="bg-white p-5 rounded-xl border border-red-200 bg-red-50/30 shadow-sm">
              <div className="flex items-center gap-3 mb-2 text-red-600">
                <AlertTriangle size={16} />
                <span className="text-sm font-medium">Overdue Payables</span>
              </div>
              <h3 className="text-2xl font-bold text-red-700">£{totalOverdue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h3>
              <p className="text-xs text-red-500 mt-1">{overduePurchases.length} bills overdue</p>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <h3 className="text-base font-semibold text-gray-800 mb-6">Expenses vs Payments (Monthly)</h3>
              <div className="h-72">
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                      <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} tickFormatter={(val) => `£${val}`} />
                      <Tooltip
                        formatter={(value: number) => [`£${value.toFixed(2)}`, undefined]}
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                      <Bar dataKey="expenses" name="Billed (Expenses)" fill="#f97316" radius={[4, 4, 0, 0]} barSize={30} />
                      <Bar dataKey="paid" name="Paid Out" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={30} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-gray-400">No data available</div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-0 overflow-hidden flex flex-col">
              <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50">
                <h3 className="text-base font-semibold text-gray-800">Top Overdue Bills</h3>
              </div>
              <div className="flex-1 overflow-auto">
                {overduePurchases.length === 0 ? (
                  <div className="p-8 text-center text-gray-400">No overdue bills!</div>
                ) : (
                  <ul className="divide-y divide-gray-100">
                    {overduePurchases.slice(0, 5).map((p: any) => (
                      <li key={p.id} className="p-4 hover:bg-gray-50 flex justify-between items-center">
                        <div>
                          <p className="font-medium text-gray-800 text-sm">{p.billNumber}</p>
                          <p className="text-xs text-red-500 mt-0.5">Due {new Date(p.dueDate).toLocaleDateString()}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-red-600">£{parseFloat(p.grandTotal).toFixed(2)}</p>
                          <button onClick={() => navigate(`/bookkeeping/${clientId}/purchase-payments`)} className="text-[10px] uppercase font-semibold text-purple-600 hover:underline mt-1">Make Pay</button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
