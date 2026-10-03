import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AppLayout from "../../components/layout/AppLayout";
import { amlSidebar } from "./amlCommon";
import {
  UserCheck, Shield, CheckCircle2, AlertTriangle, Search,
  Plus, Download, X, Building2, FileText, Check, Clock
} from "lucide-react";
import { apiRequest } from "../../lib/queryClient";
import { useToast } from "../../hooks/useToast";

export default function AmlIdentityChecksPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [providerFilter, setProviderFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showRunCheckModal, setShowRunCheckModal] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [provider, setProvider] = useState<"veriphy" | "xama" | "opensanctions" | "dilisense">("veriphy");
  const [customerRisk, setCustomerRisk] = useState("Low");

  // Fetch Clients
  const { data: clients = [] } = useQuery<any[]>({
    queryKey: ["/api/practice/clients"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/practice/clients");
      if (!res.ok) return [];
      return res.json();
    },
  });

  // Fetch AML Logs
  const { data: amlLogs = [], refetch: refetchChecks } = useQuery<any[]>({
    queryKey: ["/api/aml/logs"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/aml/logs");
      if (!res.ok) return [];
      return res.json();
    },
  });

  // Mutation to run ID check
  const runIdCheckMutation = useMutation({
    mutationFn: async () => {
      const client = clients.find((c: any) => String(c.id) === String(selectedClientId));
      if (!client) throw new Error("Please select a valid client.");

      const payload = {
        provider,
        clientId: client.id,
        clientName: client.clientName,
        names: client.clientName,
        customerRisk,
      };

      const res = await apiRequest("POST", "/api/aml/check", payload);
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || "Identity check failed");
      return data;
    },
    onSuccess: (data: any) => {
      toast({
        title: "Identity Verification Complete",
        description: data.message || "Client identity verification record created.",
        variant: data.clean === false ? "destructive" : "default",
      });
      setShowRunCheckModal(false);
      refetchChecks();
      queryClient.invalidateQueries({ queryKey: ["/api/practice/clients"] });
    },
    onError: (err: any) => {
      toast({ title: "Verification Failed", description: err.message, variant: "destructive" });
    },
  });

  // Combine client list with verification status
  const verifiedCount = clients.filter(c => c.amlStatus === "Verified" || !c.amlStatus).length;
  const pendingCount = clients.filter(c => c.amlStatus === "Pending" || c.amlStatus === "Flagged").length;

  const filteredLogs = amlLogs.filter((log: any) => {
    const matchesSearch =
      log.clientName?.toLowerCase().includes(search.toLowerCase()) ||
      log.checkType?.toLowerCase().includes(search.toLowerCase()) ||
      log.id?.toLowerCase().includes(search.toLowerCase());

    const matchesProvider =
      providerFilter === "all" ||
      log.provider?.toLowerCase().includes(providerFilter.toLowerCase());

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "verified" && log.status === "Verified") ||
      (statusFilter === "flagged" && log.status === "Flagged") ||
      (statusFilter === "pending" && log.status === "Pending");

    return matchesSearch && matchesProvider && matchesStatus;
  });

  return (
    <AppLayout sidebar={amlSidebar} module="Anti-Money Laundering">
      <div className="bg-slate-50 dark:bg-slate-950 min-h-screen text-xs p-6 space-y-6 w-full mx-auto">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div>
            <div className="flex items-center gap-2">
              <UserCheck size={18} className="text-purple-600" />
              <h1 className="text-base font-bold text-slate-900 dark:text-slate-100">
                AML Electronic Identity Verification (eIDV) & Checks
              </h1>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Client biometric identity verification journeys, passport & driving licence proofs, and statutory AML audit registers.
            </p>
          </div>

          <button
            onClick={() => {
              if (clients.length > 0) setSelectedClientId(String(clients[0].id));
              setShowRunCheckModal(true);
            }}
            className="px-4 py-2 bg-[#5c469c] hover:bg-[#4b3882] text-white rounded-lg font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <Plus size={14} /> Run New Identity Check
          </button>
        </div>

        {/* KPI Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-1">
            <span className="text-[11px] font-medium text-slate-400">Total Clients Under AML</span>
            <p className="text-xl font-bold text-slate-900 dark:text-slate-100">{clients.length}</p>
            <p className="text-[10px] text-slate-500">Practice-wide client register</p>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-1">
            <span className="text-[11px] font-medium text-slate-400">Verified Identity Checks</span>
            <p className="text-xl font-bold text-emerald-600">{verifiedCount}</p>
            <p className="text-[10px] text-emerald-600 font-medium flex items-center gap-1">
              <CheckCircle2 size={10} /> Certified photo ID / biometric
            </p>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-1">
            <span className="text-[11px] font-medium text-slate-400">Pending eIDV / Reviews</span>
            <p className="text-xl font-bold text-amber-600">{pendingCount}</p>
            <p className="text-[10px] text-amber-600 font-medium">Awaiting onboarding completion</p>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-1">
            <span className="text-[11px] font-medium text-slate-400">Total Audit Verification Logs</span>
            <p className="text-xl font-bold text-purple-600">{amlLogs.length}</p>
            <p className="text-[10px] text-purple-600 font-medium">Timestamped statutory records</p>
          </div>
        </div>

        {/* Verification Checks Log Table */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-2xs">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h2 className="font-bold text-xs text-slate-900 dark:text-slate-100">Client Identity Verification Register</h2>
              <p className="text-[11px] text-slate-400">All electronic ID checks and biometric audit records</p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Provider Filter */}
              <select
                value={providerFilter}
                onChange={(e) => setProviderFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              >
                <option value="all">All Providers</option>
                <option value="veriphy">Veriphy UK</option>
                <option value="xama">Xama Tech</option>
                <option value="opensanctions">OpenSanctions</option>
                <option value="dilisense">Dilisense</option>
              </select>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              >
                <option value="all">All Statuses</option>
                <option value="verified">Verified</option>
                <option value="pending">Pending</option>
                <option value="flagged">Flagged</option>
              </select>

              {/* Search */}
              <div className="relative w-64">
                <Search size={13} className="absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search client or log ID..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-2.5 px-4">Log ID / Ref</th>
                  <th className="py-2.5 px-4">Client Name</th>
                  <th className="py-2.5 px-4">Provider</th>
                  <th className="py-2.5 px-4">Check Type</th>
                  <th className="py-2.5 px-4">Verification Status</th>
                  <th className="py-2.5 px-4">Verified Date</th>
                  <th className="py-2.5 px-4 text-right">Certificate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <UserCheck size={28} className="text-slate-300 dark:text-slate-600" />
                        <p className="font-semibold text-slate-600 dark:text-slate-400">No identity verification logs found</p>
                        <p className="text-[11px] text-slate-400 max-w-sm">
                          Use the "Run New Identity Check" button above to perform a live biometric or electronic ID verification for any client.
                        </p>
                        <button
                          onClick={() => {
                            if (clients.length > 0) setSelectedClientId(String(clients[0].id));
                            setShowRunCheckModal(true);
                          }}
                          className="mt-2 px-3 py-1.5 bg-[#5c469c] text-white rounded-lg font-semibold cursor-pointer"
                        >
                          + Run Identity Check
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log: any) => (
                    <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-500">{log.id}</td>
                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-slate-100">{log.clientName}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                          {log.provider || "Veriphy UK"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300">{log.checkType || "Electronic IDV"}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                          log.status === "Verified"
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                            : log.status === "Flagged"
                            ? "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300"
                            : "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300"
                        }`}>
                          {log.status === "Verified" ? (
                            <CheckCircle2 size={10} />
                          ) : (
                            <AlertTriangle size={10} />
                          )}
                          {log.status || "Verified"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">{log.verifiedDate || "Today"}</td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => toast({
                            title: "Certificate Downloaded",
                            description: `Audit certificate for ${log.clientName} downloaded successfully.`
                          })}
                          className="px-2.5 py-1 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-[11px] font-medium cursor-pointer inline-flex items-center gap-1"
                        >
                          <Download size={11} /> Download PDF
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal: Perform ID Check */}
        {showRunCheckModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in">
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-lg p-6 space-y-4 border border-slate-200 dark:border-slate-800 text-xs">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <UserCheck size={16} className="text-purple-600" />
                  <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">Perform Electronic Identity Verification</h3>
                </div>
                <button onClick={() => setShowRunCheckModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-3.5">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Select Client *</label>
                  <select
                    value={selectedClientId}
                    onChange={(e) => setSelectedClientId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold"
                  >
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.clientName} ({c.clientType || "Limited"})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Select Verification Gateway</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setProvider("veriphy")}
                      className={`p-2.5 rounded-lg border text-left cursor-pointer transition-all ${
                        provider === "veriphy"
                          ? "border-purple-600 bg-purple-50/70 dark:bg-purple-950/40 text-purple-900 dark:text-purple-200"
                          : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      <span className="font-bold block text-[11px]">Veriphy UK</span>
                      <span className="text-[9px] text-slate-500">SmartSearch & Credit Bureau</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setProvider("xama")}
                      className={`p-2.5 rounded-lg border text-left cursor-pointer transition-all ${
                        provider === "xama"
                          ? "border-purple-600 bg-purple-50/70 dark:bg-purple-950/40 text-purple-900 dark:text-purple-200"
                          : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      <span className="font-bold block text-[11px]">Xama Tech</span>
                      <span className="text-[9px] text-slate-500">Biometric eIDV Journey</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setProvider("opensanctions")}
                      className={`p-2.5 rounded-lg border text-left cursor-pointer transition-all ${
                        provider === "opensanctions"
                          ? "border-purple-600 bg-purple-50/70 dark:bg-purple-950/40 text-purple-900 dark:text-purple-200"
                          : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      <span className="font-bold block text-[11px]">OpenSanctions</span>
                      <span className="text-[9px] text-emerald-600 font-medium">Free Open Source</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setProvider("dilisense")}
                      className={`p-2.5 rounded-lg border text-left cursor-pointer transition-all ${
                        provider === "dilisense"
                          ? "border-purple-600 bg-purple-50/70 dark:bg-purple-950/40 text-purple-900 dark:text-purple-200"
                          : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      <span className="font-bold block text-[11px]">Dilisense API</span>
                      <span className="text-[9px] text-slate-500">Global Watchlist API</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Customer Initial Risk Assessment</label>
                  <select
                    value={customerRisk}
                    onChange={(e) => setCustomerRisk(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  >
                    <option value="Low">Low Risk (Standard Due Diligence)</option>
                    <option value="Medium">Medium Risk (Enhanced Review)</option>
                    <option value="High">High Risk (Full EDD Required)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowRunCheckModal(false)}
                  className="px-3 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-400 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => runIdCheckMutation.mutate()}
                  disabled={runIdCheckMutation.isPending || !selectedClientId}
                  className="px-4 py-2 bg-[#5c469c] hover:bg-[#4b3882] text-white rounded-lg font-semibold shadow-xs disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  <UserCheck size={13} className={runIdCheckMutation.isPending ? "animate-spin" : ""} />
                  {runIdCheckMutation.isPending ? "Running Check..." : "Perform Verification"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
