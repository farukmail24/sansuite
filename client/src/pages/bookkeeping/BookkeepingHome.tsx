import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useRoute } from "wouter";
import AppLayout from "../../components/layout/AppLayout";
import {
  LayoutDashboard, FileText, ShoppingCart, Wallet,
  Users, BarChart2, Settings, Plus, Search
} from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, LineChart, Line, XAxis, YAxis } from "recharts";
import { apiRequest } from "../../lib/queryClient";
import NewClientModal from "../../components/modals/NewClientModal";
import { bookkeepingSidebar, getClientSidebar } from "./sidebar";



// Dynamic data is now fetched from /api/bookkeeping/dashboard-stats

export default function BookkeepingHome() {
  const [match, params] = useRoute("/bookkeeping/:id/*");
  const clientId = match ? params?.id : "";
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<"All Clients" | "VAT Clients">("All Clients");
  const [clientType, setClientType] = useState("All");
  const [search, setSearch] = useState("");
  const [isNewClientModalOpen, setIsNewClientModalOpen] = useState(false);

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ["/api/practice/clients"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/practice/clients");
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: statsData } = useQuery({
    queryKey: ["/api/bookkeeping/dashboard-stats"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/bookkeeping/dashboard-stats");
      if (!res.ok) return { vatStatusData: [], monthlyData: [] };
      return res.json();
    }
  });

  const vatStatusData = statsData?.vatStatusData || [];
  const monthlyData = statsData?.monthlyData || [];

  const filtered = clients.filter((c: any) => {
    const matchSearch = c.clientName?.toLowerCase().includes(search.toLowerCase());
    const matchType = clientType === "All" || c.clientType === clientType;
    return matchSearch && matchType;
  });

  return (
    <AppLayout sidebar={clientId ? getClientSidebar(clientId) : bookkeepingSidebar} module="Bookkeeping">
      <div className="p-6 space-y-5">
        {/* VAT Summary Widget */}
        <div className="SanSuite-card p-5">
          <h3 className="font-semibold text-gray-700 mb-4 text-sm border-b pb-3">VAT Summary</h3>
          <div className="flex gap-8 items-center">
            {/* Donut Chart */}
            <div className="text-center">
              <PieChart width={160} height={160}>
                <Pie data={vatStatusData} cx={75} cy={75} innerRadius={45} outerRadius={72} dataKey="value">
                  {vatStatusData.map((entry: any, i: number) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip formatter={(val, name) => [val, name]} />
              </PieChart>
              <p className="text-xs text-gray-400 -mt-2">Return(s) in Current Month</p>
            </div>
            {/* Legend */}
            <div className="space-y-2">
              {vatStatusData.map((item: any) => (
                <div key={item.name} className="flex items-center gap-2 text-xs">
                  <div className="w-3 h-3 rounded-full" style={{ background: item.color }} />
                  <span className="text-gray-600">{item.name}</span>
                  <span className="font-bold text-gray-800 ml-1">{item.value}</span>
                </div>
              ))}
            </div>
            {/* Line chart */}
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-gray-500">Monthly Submitted Return(s)</p>
                <select className="text-xs border border-gray-200 rounded px-2 py-1">
                  <option>2026</option><option>2025</option>
                </select>
              </div>
              <ResponsiveContainer width="100%" height={120}>
                <LineChart data={monthlyData}>
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" stroke="#6c5ce7" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Practice Hub Guidance Banner */}
        <div className="bg-purple-50/80 border border-purple-200/80 rounded-xl p-3.5 flex items-center justify-between text-xs text-purple-900 shadow-sm">
          <div className="flex items-center gap-2 font-medium">
            <span className="bg-purple-600 text-white rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">Practice Hub</span>
            <span>Select a client from the list below to enter their individual bookkeeping workspace (Sales, Purchases, Bank, VAT & Reports).</span>
          </div>
        </div>

        {/* Client List */}
        <div className="SanSuite-card">

          {/* Tabs */}
          <div className="flex items-center border-b px-4 justify-between">
            <div className="flex">
              {(["All Clients", "VAT Clients"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === tab ? "border-purple-600 text-purple-700" : "border-transparent text-gray-500"
                    }`}
                >
                  {tab}
                </button>
              ))}
            </div>
            <button className="btn-SanSuite flex items-center gap-1 text-xs" onClick={() => setIsNewClientModalOpen(true)}>
              <Plus size={13} /> Client
            </button>
          </div>

          <div className="p-4">
            <div className="flex items-center gap-3 mb-4">
              <select value={clientType} onChange={(e) => setClientType(e.target.value)}
                className="text-xs border border-gray-200 rounded px-2 py-1.5">
                {["All", "Limited", "SoleTrader", "Partnership", "Charity"].map((t) => <option key={t}>{t}</option>)}
              </select>
              <div className="relative flex-1 max-w-sm">
                <Search size={13} className="absolute left-3 top-2 text-gray-400" />
                <input value={search} onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by Client Name or ID..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-purple-400" />
              </div>
            </div>

            <table className="SanSuite-table">
              <thead>
                <tr>
                  <th>S.No.</th><th>Client ID</th><th>Client Name</th><th>Client Type</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={4} className="text-center py-8 text-gray-400">Loading...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={4} className="text-center py-8 text-gray-400 text-xs">No clients found. Click + Client to add one.</td></tr>
                ) : filtered.map((c: any, i: number) => (
                  <tr key={c.id}>
                    <td>{i + 1}</td>
                    <td className="text-gray-500 text-xs">{c.clientCode}</td>
                    <td>
                      <button
                        onClick={() => navigate(`/bookkeeping/${c.id}`)}
                        className="text-purple-600 hover:underline font-medium"
                      >
                        {c.clientName}
                      </button>
                    </td>
                    <td>{c.clientType}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length > 0 && (
              <div className="flex items-center justify-between mt-3 text-xs text-gray-400 border-t pt-3">
                <span>Displaying 1 to {filtered.length} out of {filtered.length} Clients</span>
              </div>
            )}
          </div>
        </div>
      </div>
      <NewClientModal isOpen={isNewClientModalOpen} onClose={() => setIsNewClientModalOpen(false)} />
    </AppLayout>
  );
}
