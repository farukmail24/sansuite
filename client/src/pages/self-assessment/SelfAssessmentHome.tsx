import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "../../lib/queryClient";
import AppLayout from "../../components/layout/AppLayout";
import {
  LayoutDashboard, FileText, Settings, Plus, Search,
  UserCheck, Calculator, Shield, CheckCircle2, ArrowRight,
  ExternalLink, FileSignature, RefreshCw, AlertCircle, Users, HelpCircle
} from "lucide-react";
import { Link } from "wouter";
import SendToeSignModal from "../../components/esign/SendToeSignModal";
import TablePagination from "../../components/common/TablePagination";
import NewClientModal from "../../components/modals/NewClientModal";

const sidebar = [
  { label: "SA100 Returns", icon: <LayoutDashboard size={15} />, route: "/self-assessment" },
  { label: "SA800 (Partnerships)", icon: <Users size={15} />, route: "/self-assessment/sa800" },
  { label: "Questionnaire", icon: <HelpCircle size={15} />, route: "/self-assessment/questionnaire" },
  { label: "Settings", icon: <Settings size={15} />, route: "/self-assessment/settings" },
];

export default function SelfAssessmentHome() {
  const [search, setSearch] = useState("");
  const [selectedType, setSelectedType] = useState<string>("All");
  const [selectedTaxYear, setSelectedTaxYear] = useState<string>("2025/2026");
  const [eSignModalClient, seteSignModalClient] = useState<any | null>(null);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(25);

  // Universal Add Client Modal state
  const [isNewClientModalOpen, setIsNewClientModalOpen] = useState(false);

  const { data: clients = [], isLoading, refetch } = useQuery<any[]>({
    queryKey: ["/api/practice/clients"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/practice/clients");
      if (!res.ok) return [];
      return res.json();
    },
    select: (list: any[]) => {
      return list.filter((c: any) =>
        ["Individual", "SoleTrader", "Partnership", "Trust"].includes(c.clientType) ||
        c.clientType === "Individual" ||
        c.clientType === "SoleTrader"
      );
    },
  });

  const filtered = useMemo(() => {
    return clients.filter((c: any) => {
      const matchesSearch =
        c.clientName?.toLowerCase().includes(search.toLowerCase()) ||
        c.clientCode?.toLowerCase().includes(search.toLowerCase()) ||
        c.utrNumber?.toLowerCase().includes(search.toLowerCase()) ||
        c.niNumber?.toLowerCase().includes(search.toLowerCase());

      const matchesType =
        selectedType === "All" ||
        (selectedType === "Individual" && c.clientType === "Individual") ||
        (selectedType === "SoleTrader" && c.clientType === "SoleTrader") ||
        (selectedType === "Partnership" && c.clientType === "Partnership") ||
        (selectedType === "Trust" && c.clientType === "Trust");

      return matchesSearch && matchesType;
    });
  }, [clients, search, selectedType]);

  // Paginated records
  const paginatedClients = useMemo(() => {
    if (pageSize >= 999999) return filtered;
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  return (
    <AppLayout sidebar={sidebar} module="Self Assessment">
      <div className="bg-slate-50 dark:bg-slate-950 min-h-screen text-xs p-6 space-y-6 w-full mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div>
            <div className="flex items-center gap-2">
              <UserCheck size={16} className="text-purple-600" />
              <h1 className="text-base font-bold text-slate-900 dark:text-slate-100">Self Assessment (SA100 / SA800) Directory</h1>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Manage personal tax returns, sole trader computations, rental properties, capital gains, SA302 calculations, and HMRC statutory filings.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => refetch()}
              className="px-3 py-1.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RefreshCw size={13} />
              Refresh
            </button>
            <button
              onClick={() => setIsNewClientModalOpen(true)}
              className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <Plus size={14} />
              Add SA Client
            </button>
          </div>
        </div>

        {/* Filters and Search Bar */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 min-w-[280px]">
            <div className="relative flex-1 max-w-md">
              <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search by client name, code, UTR, or NI number..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all"
              />
            </div>

            {/* Client Type Filter */}
            <select
              value={selectedType}
              onChange={(e) => {
                setSelectedType(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 outline-none cursor-pointer"
            >
              <option value="All">All Client Types</option>
              <option value="Individual">Individual</option>
              <option value="SoleTrader">Sole Trader</option>
              <option value="Partnership">Partnership</option>
              <option value="Trust">Trust</option>
            </select>

            {/* Tax Year Filter */}
            <select
              value={selectedTaxYear}
              onChange={(e) => setSelectedTaxYear(e.target.value)}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 outline-none cursor-pointer"
            >
              <option value="2025/2026">Tax Year 2025/2026</option>
              <option value="2024/2025">Tax Year 2024/2025</option>
              <option value="2023/2024">Tax Year 2023/2024</option>
              <option value="2022/2023">Tax Year 2022/2023</option>
            </select>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>Showing <strong className="text-slate-900 dark:text-slate-100">{filtered.length}</strong> eligible Self Assessment clients</span>
          </div>
        </div>

        {/* Clients Table */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">
                  <th className="py-3 px-4">Client Name</th>
                  <th className="py-3 px-4">Client Code</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">UTR (10-digit)</th>
                  <th className="py-3 px-4">National Insurance</th>
                  <th className="py-3 px-4">Tax Year</th>
                  <th className="py-3 px-4">Return Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <RefreshCw size={20} className="animate-spin text-purple-600" />
                        <span className="text-xs">Loading Self Assessment clients...</span>
                      </div>
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-14 text-center">
                      <div className="max-w-sm mx-auto flex flex-col items-center gap-2">
                        <div className="p-3 bg-purple-50 dark:bg-purple-900/20 text-purple-600 rounded-full">
                          <UserCheck size={24} />
                        </div>
                        <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">No Self Assessment Clients Found</h3>
                        <p className="text-[11px] text-slate-500">
                          {search ? "No clients match your search query." : "There are currently no Individual or Sole Trader clients configured for Self Assessment."}
                        </p>
                        <button
                          onClick={() => setIsNewClientModalOpen(true)}
                          className="mt-2 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Plus size={13} />
                          Add SA Client
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedClients.map((c: any) => {
                    const isPartnership = c.clientType === "Partnership";
                    const workspaceUrl = isPartnership
                      ? `/self-assessment/sa800`
                      : `/self-assessment/${c.id}/dashboard`;

                    return (
                      <tr key={c.id} className="hover:bg-slate-50/75 dark:hover:bg-slate-800/40 transition-colors group">
                        <td className="py-3 px-4">
                          <Link href={workspaceUrl} className="font-bold text-slate-900 dark:text-slate-100 group-hover:text-purple-600 flex items-center gap-1.5">
                            {c.clientName}
                            <ArrowRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity text-purple-600" />
                          </Link>
                          <span className="text-[10px] text-slate-400">{c.email || "No email on file"}</span>
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                          {c.clientCode || "—"}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold ${
                            c.clientType === "Partnership"
                              ? "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800"
                              : c.clientType === "SoleTrader"
                              ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800"
                              : "bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-800"
                          }`}>
                            {c.clientType || "Individual"}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px]">
                          {c.utrNumber ? (
                            <span className="font-semibold text-slate-700 dark:text-slate-300">{c.utrNumber}</span>
                          ) : (
                            <span className="text-amber-600 dark:text-amber-400 text-[10px] flex items-center gap-1">
                              <AlertCircle size={10} /> Missing UTR
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                          {c.niNumber || "—"}
                        </td>
                        <td className="py-3 px-4 text-[11px] text-slate-600 dark:text-slate-400 font-medium">
                          {selectedTaxYear}
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            Draft
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="inline-flex items-center gap-2">
                            <button
                              onClick={() => seteSignModalClient(c)}
                              className="px-2.5 py-1 text-[11px] font-semibold text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/50 hover:bg-purple-100 dark:hover:bg-purple-900/50 border border-purple-200 dark:border-purple-800 rounded-md transition-colors cursor-pointer flex items-center gap-1"
                              title="Send SA100 for Client E-Signature Approval"
                            >
                              <FileSignature size={11} />
                              eSign
                            </button>
                            <Link
                              href={workspaceUrl}
                              className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-md text-[11px] font-semibold inline-flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
                            >
                              Open Workspace
                              <ArrowRight size={11} />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Universal Table Pagination */}
          <TablePagination
            totalItems={filtered.length}
            currentPage={currentPage}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setCurrentPage(1);
            }}
          />
        </div>
      </div>

      {/* Universal NewClientModal */}
      <NewClientModal
        isOpen={isNewClientModalOpen}
        onClose={() => setIsNewClientModalOpen(false)}
        defaultClientType="Individual"
      />

      {eSignModalClient && (
        <SendToeSignModal
          open={!!eSignModalClient}
          onOpenChange={(open: boolean) => !open && seteSignModalClient(null)}
          defaultTitle={`Self Assessment SA100 Approval - ${eSignModalClient.clientName}`}
          sourceModule="Self Assessment"
          clientId={eSignModalClient.id}
          clientName={eSignModalClient.clientName}
          clientEmail={eSignModalClient.email || ""}
        />
      )}
    </AppLayout>
  );
}

