import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "../../lib/queryClient";
import AppLayout from "../../components/layout/AppLayout";
import {
  LayoutDashboard, FileText, Settings, Plus, Search,
  Building2, Calculator, Shield, CheckCircle2, ArrowRight,
  ExternalLink, FileSignature, RefreshCw, AlertCircle
} from "lucide-react";
import { Link } from "wouter";
import SendToeSignModal from "../../components/esign/SendToeSignModal";
import TablePagination from "../../components/common/TablePagination";

const sidebar = [
  { label: "Dashboard", icon: <LayoutDashboard size={15} />, route: "/corporation-tax" },
  { label: "Settings", icon: <Settings size={15} />, route: "/corporation-tax/settings" },
];

export default function CorporationTaxHome() {
  const [search, setSearch] = useState("");
  const [eSignModalClient, seteSignModalClient] = useState<any | null>(null);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(25);

  const { data: clients = [], isLoading, refetch } = useQuery<any[]>({
    queryKey: ["/api/practice/clients"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/practice/clients");
      if (!res.ok) return [];
      return res.json();
    },
    select: (list: any[]) => list.filter((c: any) => c.clientType === "Limited" || !c.clientType),
  });

  const filtered = useMemo(() => {
    return clients.filter((c: any) =>
      c.clientName?.toLowerCase().includes(search.toLowerCase()) ||
      c.registrationNumber?.toLowerCase().includes(search.toLowerCase()) ||
      c.utrNumber?.toLowerCase().includes(search.toLowerCase())
    );
  }, [clients, search]);

  // Paginated records
  const paginatedClients = useMemo(() => {
    if (pageSize >= 999999) return filtered;
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  return (
    <AppLayout sidebar={sidebar} module="Corporation Tax">
      <div className="bg-slate-50 dark:bg-slate-950 min-h-screen text-xs p-6 space-y-6 w-full mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div>
            <div className="flex items-center gap-2">
              <Building2 size={16} className="text-indigo-600" />
              <h1 className="text-base font-bold text-slate-900 dark:text-slate-100">Corporation Tax (CT600) Directory</h1>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Manage Limited Company corporate tax computations, Capital Allowances, and HMRC statutory filings.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => refetch()}
              className="px-3 py-1.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RefreshCw size={12} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Statutory KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
            <span className="text-[11px] font-medium text-slate-400">Total Limited Companies</span>
            <p className="text-xl font-bold text-slate-900 dark:text-slate-100">{clients.length}</p>
            <p className="text-[10px] text-emerald-600 font-medium flex items-center gap-1">
              <CheckCircle2 size={10} /> Active corporate tax entities
            </p>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
            <span className="text-[11px] font-medium text-slate-400">UK Standard CT Rates</span>
            <p className="text-xl font-bold text-indigo-600">19% / 25%</p>
            <p className="text-[10px] text-slate-500 font-medium">Marginal Relief £50k - £250k (3/200)</p>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
            <span className="text-[11px] font-medium text-slate-400">HMRC Gateway Protocol</span>
            <p className="text-xl font-bold text-emerald-600">GovTalk XML</p>
            <p className="text-[10px] text-slate-500 font-medium">IR Mark Certified Pre-Filing</p>
          </div>
        </div>

        {/* Limited Companies Table Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 className="font-bold text-xs text-slate-900 dark:text-slate-100">Corporate Clients Directory</h2>
            <div className="relative w-full sm:w-72">
              <Search size={13} className="absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search by company name, UTR or Reg No..."
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-2.5 px-4 font-semibold">Company Name</th>
                  <th className="py-2.5 px-4 font-semibold">Reg Number</th>
                  <th className="py-2.5 px-4 font-semibold">Company 10-Digit UTR</th>
                  <th className="py-2.5 px-4 font-semibold">Trading Status</th>
                  <th className="py-2.5 px-4 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      <div className="flex items-center justify-center gap-2">
                        <RefreshCw size={14} className="animate-spin text-indigo-600" />
                        <span>Loading corporate entities...</span>
                      </div>
                    </td>
                  </tr>
                ) : paginatedClients.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      No corporate entities found matching your search.
                    </td>
                  </tr>
                ) : (
                  paginatedClients.map((c: any) => (
                    <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">
                        {c.clientName}
                      </td>
                      <td className="py-3 px-4 font-mono">
                        {c.registrationNumber ? (
                          <a
                            href={`https://find-and-update.company-information.service.gov.uk/company/${encodeURIComponent(c.registrationNumber.trim())}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 hover:underline inline-flex items-center gap-1 cursor-pointer font-medium"
                            title="Open in Companies House"
                          >
                            <span>{c.registrationNumber}</span>
                            <ExternalLink size={10} />
                          </a>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-indigo-600">
                        {c.utrNumber || <span className="text-slate-400 font-normal">Not Set</span>}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                          {c.tradingStatus || "Active"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => seteSignModalClient(c)}
                            className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/40 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 rounded-md font-medium inline-flex items-center gap-1 cursor-pointer transition-colors"
                            title="Send CT600 for Client Digital eSign Approval"
                          >
                            <FileSignature size={11} />
                            <span>eSign</span>
                          </button>

                          <Link href={`/corporation-tax/${c.id}/dashboard`}>
                            <span className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md font-medium inline-flex items-center gap-1 cursor-pointer shadow-xs transition-colors">
                              <span>Open CT Workspace</span>
                              <ArrowRight size={11} />
                            </span>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Universal Pagination */}
          {filtered.length > 0 && (
            <div className="p-4 border-t border-slate-200 dark:border-slate-800">
              <TablePagination
                currentPage={currentPage}
                totalItems={filtered.length}
                pageSize={pageSize}
                onPageChange={(p) => setCurrentPage(p)}
                onPageSizeChange={(s) => {
                  setPageSize(s);
                  setCurrentPage(1);
                }}
                pageSizeOptions={[25, 50, 75, 100, "All"]}
                itemName="Corporate Entities"
              />
            </div>
          )}
        </div>
      </div>

      {eSignModalClient && (
        <SendToeSignModal
          open={!!eSignModalClient}
          onOpenChange={(open: boolean) => !open && seteSignModalClient(null)}
          defaultTitle={`CT600 Corporation Tax Return - ${eSignModalClient.clientName}`}
          sourceModule="Corporation Tax"
          clientId={eSignModalClient.id}
          clientName={eSignModalClient.clientName}
          clientEmail={eSignModalClient.email || ""}
        />
      )}
    </AppLayout>
  );
}
