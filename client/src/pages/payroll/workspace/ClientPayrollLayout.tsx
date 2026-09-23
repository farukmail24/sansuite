import { useState, createContext, useContext, ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRoute, useLocation, Link } from "wouter";
import AppLayout from "../../../components/layout/AppLayout";
import { getClientPayrollSidebar } from "../sidebar";
import {
  Building2, ChevronRight, ArrowLeft, ShieldCheck,
  Calendar, FileText, CheckCircle2, ChevronDown
} from "lucide-react";
import { apiRequest } from "../../../lib/queryClient";

export interface ClientPayrollContextType {
  clientId: string;
  client: any;
  scheme: any;
  taxYear: string;
  setTaxYear: (year: string) => void;
  isLoading: boolean;
  refetchClient: () => void;
  refetchScheme: () => void;
}

const ClientPayrollContext = createContext<ClientPayrollContextType | null>(null);

export function useClientPayroll() {
  const context = useContext(ClientPayrollContext);
  if (!context) {
    throw new Error("useClientPayroll must be used within a ClientPayrollLayout");
  }
  return context;
}

interface ClientPayrollLayoutProps {
  children: ReactNode;
  activeSection?: string;
}

export default function ClientPayrollLayout({ children }: ClientPayrollLayoutProps) {
  const [, paramsDirect] = useRoute("/payroll/:clientId");
  const [, paramsSub] = useRoute("/payroll/:clientId/:subpage*");
  const clientId = paramsDirect?.clientId || paramsSub?.clientId || "1";

  const [, navigate] = useLocation();
  const [taxYear, setTaxYear] = useState("2024-25");

  // 1. Fetch practice clients for switcher
  const { data: clients = [] } = useQuery<any[]>({
    queryKey: ["/api/practice/clients"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/practice/clients");
      if (!res.ok) return [];
      return res.json();
    },
  });

  // 2. Current Client Details
  const client = clients.find((c) => String(c.id) === String(clientId)) || {
    id: clientId,
    clientName: `Employer #${clientId}`,
    companyNumber: "—",
    email: "—"
  };

  // 3. Fetch PAYE scheme for this client
  const { data: schemes = [], refetch: refetchScheme } = useQuery<any[]>({
    queryKey: ["/api/payroll/schemes"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/payroll/schemes");
      if (!res.ok) return [];
      return res.json();
    },
  });

  const scheme = schemes.find((s) => String(s.clientId) === String(clientId)) || schemes[0] || null;

  const sidebar = getClientPayrollSidebar(clientId);

  return (
    <ClientPayrollContext.Provider
      value={{
        clientId,
        client,
        scheme,
        taxYear,
        setTaxYear,
        isLoading: false,
        refetchClient: () => { },
        refetchScheme,
      }}
    >
      <AppLayout sidebar={sidebar} module="Payroll">
        <div className="bg-gray-50 min-h-screen">
          {/* Client Header Banner */}
          <div className="bg-white border-b border-gray-200 px-6 py-3.5 sticky top-0 z-30 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {/* Left breadcrumb & Client selector */}
              <div className="flex items-center gap-3">
                <Link
                  href="/payroll"
                  className="text-gray-400 hover:text-purple-600 p-1 rounded-md hover:bg-gray-100 transition-colors cursor-pointer"
                  title="Back to Employers Directory"
                >
                  <ArrowLeft size={16} />
                </Link>

                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-700 font-bold text-xs shrink-0">
                    <Building2 size={16} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <select
                        value={clientId}
                        onChange={(e) => navigate(`/payroll/${e.target.value}/dashboard`)}
                        className="font-bold text-sm text-gray-900 bg-transparent border-0 pr-6 py-0 focus:ring-0 cursor-pointer hover:text-purple-700"
                      >
                        {clients.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.clientName || c.name || `Client #${c.id}`}
                          </option>
                        ))}
                      </select>
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-green-50 text-green-700 border border-green-200 flex items-center gap-1">
                        <CheckCircle2 size={10} /> RTI Active
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                      <span>PAYE: <strong className="font-mono text-gray-700">{scheme?.payeReference || "Not configured"}</strong></span>
                      <span>•</span>
                      <span>Accounts Office: <strong className="font-mono text-gray-700">{scheme?.accountsOfficeReference || "—"}</strong></span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right: Tax Year Selector & Actions */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1 text-xs">
                  <Calendar size={13} className="text-gray-400" />
                  <span className="text-gray-500 font-medium">Tax Year:</span>
                  <select
                    value={taxYear}
                    onChange={(e) => setTaxYear(e.target.value)}
                    className="bg-transparent border-0 p-0 text-xs font-semibold text-gray-800 focus:ring-0 cursor-pointer"
                  >
                    <option value="2024-25">2024/25</option>
                    <option value="2025-26">2025/26</option>
                    <option value="2026-27">2026/27</option>
                  </select>
                </div>

                <Link
                  href={`/payroll/${clientId}/settings`}
                  className="px-2.5 py-1 border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <FileText size={12} />
                  Scheme Settings
                </Link>
              </div>
            </div>
          </div>

          {/* Main Page Workspace Content */}
          <div className="p-6">
            {children}
          </div>
        </div>
      </AppLayout>
    </ClientPayrollContext.Provider>
  );
}
