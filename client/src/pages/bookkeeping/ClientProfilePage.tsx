import { useQuery } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import AppLayout from "../../components/layout/AppLayout";
import { apiRequest } from "../../lib/queryClient";
import { LayoutDashboard, FileText, ShoppingCart, Wallet, Users, BarChart2, Settings, Mail, Phone, MapPin, Building2, ExternalLink } from "lucide-react";
import { PieChart, Pie, Cell, Tooltip } from "recharts";
import { getClientSidebar } from "./sidebar";

export default function ClientProfilePage() {
  const [match, params] = useRoute("/bookkeeping/:id");
  const [, navigate] = useLocation();
  const clientId = params?.id;

  // Guard: only render for numeric IDs — named segments like "vat", "settings" are caught by their own routes
  const isNumericId = clientId && /^\d+$/.test(clientId);



  const { data: clients = [], isLoading } = useQuery({
    queryKey: ["/api/practice/clients"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/practice/clients");
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!isNumericId,
  });

  const client = clients.find((c: any) => String(c.id) === clientId);

  if (!isNumericId) return null; // Let the named-route handler take over
  if (isLoading) return <AppLayout sidebar={getClientSidebar(clientId)} module="Bookkeeping"><div className="p-8">Loading client...</div></AppLayout>;
  if (!client) return <AppLayout sidebar={getClientSidebar(clientId)} module="Bookkeeping"><div className="p-8 text-gray-500">Client not found. Please go back and select a client.</div></AppLayout>;

  return (
    <AppLayout sidebar={getClientSidebar(clientId)} module="Bookkeeping">
      <div className="p-6">
        <div className="flex items-center gap-2 mb-6 text-sm text-gray-500">
          <button onClick={() => navigate("/bookkeeping")} className="hover:text-purple-600 transition-colors">Bookkeeping</button>
          <span>/</span>
          <span className="font-semibold text-gray-800">{client.clientName}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Col - Client Info */}
          <div className="lg:col-span-1 space-y-6">
            <div className="SanSuite-card p-6 flex flex-col items-center text-center border-t-4 border-t-purple-500">
              <div className="w-20 h-20 rounded-full flex items-center justify-center bg-purple-100 text-purple-600 mb-4 text-2xl font-bold">
                {client.clientName[0]}
              </div>
              <h2 className="text-xl font-bold text-gray-800">{client.clientName}</h2>
              <p className="text-sm text-gray-500 font-mono mt-1">{client.clientCode}</p>
              <div className="mt-3">
                <span className="badge-info px-3 py-1">{client.clientType}</span>
              </div>
            </div>

            <div className="SanSuite-card p-6 space-y-4">
              <h3 className="font-semibold text-gray-800 border-b pb-2">Contact Details</h3>
              {client.email && (
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <Mail size={16} className="text-purple-400" />
                  <a href={`mailto:${client.email}`} className="hover:text-purple-600">{client.email}</a>
                </div>
              )}
              {client.phone && (
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <Phone size={16} className="text-purple-400" />
                  <span>{client.phone}</span>
                </div>
              )}
              {client.address && (
                <div className="flex items-start gap-3 text-sm text-gray-600">
                  <MapPin size={16} className="text-purple-400 mt-1 flex-shrink-0" />
                  <span className="leading-snug">{client.address}</span>
                </div>
              )}
              {client.registrationNumber && (
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <Building2 size={16} className="text-purple-400" />
                  <a
                    href={`https://find-and-update.company-information.service.gov.uk/company/${encodeURIComponent(client.registrationNumber.trim())}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-purple-700 hover:text-purple-900 hover:underline inline-flex items-center gap-1 transition-colors cursor-pointer"
                    title="View on Companies House (Opens in new tab)"
                  >
                    <span>Reg: {client.registrationNumber}</span>
                    <ExternalLink size={12} className="text-purple-500" />
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Right Col - Quick Stats & Links */}
          <div className="lg:col-span-2 space-y-6">
            <div className="grid grid-cols-3 gap-4">
              <div className="SanSuite-card p-5">
                <p className="text-sm text-gray-500 font-medium">Unpaid Invoices</p>
                <p className="text-2xl font-bold text-orange-500 mt-2">£0.00</p>
              </div>
              <div className="SanSuite-card p-5">
                <p className="text-sm text-gray-500 font-medium">Overdue Bills</p>
                <p className="text-2xl font-bold text-red-500 mt-2">£0.00</p>
              </div>
              <div className="SanSuite-card p-5">
                <p className="text-sm text-gray-500 font-medium">VAT Liability</p>
                <p className="text-2xl font-bold text-gray-800 mt-2">£0.00</p>
              </div>
            </div>

            <div className="SanSuite-card p-6">
              <h3 className="font-semibold text-gray-800 mb-4">Quick Actions</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <button onClick={() => navigate(`/bookkeeping/${clientId}/invoices/new`)} className="p-4 border rounded-xl hover:border-purple-400 hover:shadow-sm text-center transition-all group">
                  <FileText size={24} className="mx-auto text-purple-300 group-hover:text-purple-600 mb-2" />
                  <span className="text-xs font-medium text-gray-700">New Invoice</span>
                </button>
                <button onClick={() => navigate(`/bookkeeping/${clientId}/purchases/new`)} className="p-4 border rounded-xl hover:border-purple-400 hover:shadow-sm text-center transition-all group">
                  <ShoppingCart size={24} className="mx-auto text-purple-300 group-hover:text-purple-600 mb-2" />
                  <span className="text-xs font-medium text-gray-700">Add Purchase</span>
                </button>
                <button onClick={() => navigate(`/bookkeeping/${clientId}/bank`)} className="p-4 border rounded-xl hover:border-purple-400 hover:shadow-sm text-center transition-all group">
                  <Wallet size={24} className="mx-auto text-purple-300 group-hover:text-purple-600 mb-2" />
                  <span className="text-xs font-medium text-gray-700">Bank Reconcile</span>
                </button>
                <button onClick={() => navigate(`/bookkeeping/${clientId}/reports`)} className="p-4 border rounded-xl hover:border-purple-400 hover:shadow-sm text-center transition-all group">
                  <BarChart2 size={24} className="mx-auto text-purple-300 group-hover:text-purple-600 mb-2" />
                  <span className="text-xs font-medium text-gray-700">View Reports</span>
                </button>
              </div>
            </div>

            <div className="SanSuite-card p-6">
              <h3 className="font-semibold text-gray-800 border-b pb-3 mb-4">Recent Activity</h3>
              <div className="text-center text-sm text-gray-500 py-6">
                No recent activity for this client.
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
