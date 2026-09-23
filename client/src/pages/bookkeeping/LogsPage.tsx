import { useLocation, useRoute } from "wouter";
import AppLayout from "../../components/layout/AppLayout";
import { ChevronRight, ShieldAlert, Activity } from "lucide-react";
import { bookkeepingSidebar, getClientSidebar } from "./sidebar";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "../../lib/queryClient";
import ClientGuard from "./ClientGuard";

export default function LogsPage() {
  const [match, params] = useRoute("/bookkeeping/:id/*");
  const clientId = match ? params?.id : "";
  const [, navigate] = useLocation();

  if (!clientId) return <ClientGuard featureTitle="Audit Logs" />;

  const { data: logs = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/logs"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/logs");
      if (!res.ok) return [];
      return res.json();
    },
  });

  return (
    <AppLayout sidebar={clientId ? getClientSidebar(clientId) : bookkeepingSidebar} module="Bookkeeping">
      <div className="bg-gray-50 min-h-screen">
        <div className="bg-white px-4 py-2 border-b border-gray-200 flex items-center text-sm text-gray-500 gap-2">
          <button onClick={() => navigate("/bookkeeping")} className="hover:text-purple-600">Bookkeeping</button>
          <ChevronRight size={14} />
          <span className="font-medium text-gray-800">Audit Logs</span>
        </div>
        
        <div className="p-6 max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">System Audit Logs</h1>
              <p className="text-sm text-gray-500">Track practice user actions, logins, and automated events.</p>
            </div>
            <div className="bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg text-sm font-medium flex items-center border border-blue-200">
              <ShieldAlert size={16} className="mr-2 text-blue-600" /> Security Logging Active
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-700 font-semibold text-xs">
                <tr>
                  <th className="px-6 py-3">Timestamp</th>
                  <th className="px-6 py-3">User / Actor</th>
                  <th className="px-6 py-3">Action Type</th>
                  <th className="px-6 py-3">Resource / Module</th>
                  <th className="px-6 py-3">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {isLoading ? (
                  <tr><td colSpan={5} className="p-6 text-center text-gray-500">Loading system audit logs...</td></tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                      <Activity size={32} className="mx-auto text-gray-300 mb-2" />
                      No audit logs found for this practice.
                    </td>
                  </tr>
                ) : (
                  logs.map((log: any) => (
                    <tr key={log.id} className="hover:bg-gray-50/50">
                      <td className="px-6 py-3 whitespace-nowrap text-gray-500 text-xs">
                        {new Date(log.createdAt || Date.now()).toLocaleString()}
                      </td>
                      <td className="px-6 py-3 font-medium text-gray-800">{log.user || log.userName || 'System Staff'}</td>
                      <td className="px-6 py-3">
                        <span className="inline-block px-2 py-0.5 bg-gray-100 rounded text-xs text-gray-700 font-mono border border-gray-200">
                          {log.action || log.actionType || 'EVENT'}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-gray-600">{log.resource || log.targetType || 'System'}</td>
                      <td className="px-6 py-3 text-gray-500 truncate max-w-[300px]" title={log.details}>
                        {log.details || log.description || '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
