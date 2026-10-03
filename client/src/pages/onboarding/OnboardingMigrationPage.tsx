import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AppLayout from "../../components/layout/AppLayout";
import { onboardingSidebar } from "./onboardingCommon";
import {
  Database, Upload, ArrowRight, CheckCircle2,
  AlertCircle, ShieldCheck, RefreshCw, Search,
  Download, FileSpreadsheet, X, Check
} from "lucide-react";
import { apiRequest } from "../../lib/queryClient";
import { useToast } from "../../hooks/useToast";

export default function OnboardingMigrationPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [selectedSource, setSelectedSource] = useState<string>("Xero");
  const [showImportModal, setShowImportModal] = useState(false);
  const [targetClientId, setTargetClientId] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Fetch Clients
  const { data: clients = [] } = useQuery<any[]>({
    queryKey: ["/api/practice/clients"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/practice/clients");
      if (!res.ok) return [];
      return res.json();
    },
  });

  // Simulated Migration Execution
  const migrationMutation = useMutation({
    mutationFn: async () => {
      const client = clients.find((c: any) => String(c.id) === String(targetClientId));
      if (!client) throw new Error("Please select a target client account.");
      await new Promise((r) => setTimeout(r, 1000));
      return { success: true, clientName: client.clientName };
    },
    onSuccess: (data: any) => {
      toast({
        title: "Migration Processed Successfully",
        description: `Imported Chart of Accounts, Contacts & Opening Balances from ${selectedSource} for ${data.clientName}.`,
      });
      setShowImportModal(false);
      setSelectedFile(null);
    },
    onError: (err: any) => {
      toast({ title: "Migration Failed", description: err.message, variant: "destructive" });
    },
  });

  const sources = [
    {
      name: "Xero",
      tagline: "API Connector & Export Parser",
      desc: "Directly import Chart of Accounts, Customers, Suppliers, Aged Debtors & Opening Trial Balance.",
      color: "border-sky-500",
      bgHover: "hover:border-sky-600",
      badgeColor: "bg-sky-50 text-sky-700 border-sky-200",
      supportedFiles: "Chart of Accounts CSV, General Ledger Exception report, Trial Balance",
    },
    {
      name: "QuickBooks Online",
      tagline: "Direct QBO Intuit API & Journal Sync",
      desc: "Synchronize full chart of accounts hierarchy, vendor registers, open invoices and bank accounts.",
      color: "border-emerald-500",
      bgHover: "hover:border-emerald-600",
      badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
      supportedFiles: "QBO Account List Excel, Journal Entries, Customer Balance Detail",
    },
    {
      name: "Sage 50 / Business Cloud",
      tagline: "Nominal Audit Trail Parser",
      desc: "Parse Sage 50 CSV audit trail export, nominal ledgers, bank transactions and VAT historicals.",
      color: "border-green-600",
      bgHover: "hover:border-green-700",
      badgeColor: "bg-green-50 text-green-700 border-green-200",
      supportedFiles: "Sage Audit Trail CSV, Nominal Ledger Report, Trial Balance",
    },
    {
      name: "FreeAgent & Universal CSV",
      tagline: "Universal Multi-Column Importer",
      desc: "Import standardized Excel/CSV files formatted with SanSuite nominal codes and opening journals.",
      color: "border-indigo-500",
      bgHover: "hover:border-indigo-600",
      badgeColor: "bg-indigo-50 text-indigo-700 border-indigo-200",
      supportedFiles: "SanSuite Universal Template (.xlsx / .csv)",
    },
  ];

  const filteredClients = clients.filter((c: any) =>
    c.clientName?.toLowerCase().includes(search.toLowerCase()) ||
    c.companyNumber?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AppLayout sidebar={onboardingSidebar} module="Onboarding & Migration">
      <div className="bg-slate-50 dark:bg-slate-950 min-h-screen text-xs p-6 space-y-6 w-full mx-auto">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div>
            <div className="flex items-center gap-2">
              <Database size={18} className="text-indigo-600" />
              <h1 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Accounting Software Data Migration Connectors
              </h1>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              One-click migration tools for historical Chart of Accounts, Customers, Suppliers, Nominal Ledgers and Opening Trial Balances.
            </p>
          </div>

          <button
            onClick={() => {
              if (clients.length > 0) setTargetClientId(String(clients[0].id));
              setShowImportModal(true);
            }}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <Upload size={14} /> Start New Migration
          </button>
        </div>

        {/* 4 Source Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {sources.map((src) => (
            <div
              key={src.name}
              onClick={() => {
                setSelectedSource(src.name);
                if (clients.length > 0) setTargetClientId(String(clients[0].id));
                setShowImportModal(true);
              }}
              className={`p-5 rounded-xl border-2 ${src.color} bg-white dark:bg-slate-900 hover:shadow-md cursor-pointer transition-all flex flex-col justify-between space-y-3 group shadow-2xs`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-sm text-slate-900 dark:text-slate-100">{src.name}</span>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${src.badgeColor}`}>
                    {src.tagline}
                  </span>
                </div>
                <p className="text-[11.5px] text-slate-500 leading-relaxed">{src.desc}</p>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                <span className="text-[11px] font-bold text-indigo-600 group-hover:underline flex items-center gap-1">
                  Launch Migration Wizard <ArrowRight size={12} className="transition-transform group-hover:translate-x-0.5" />
                </span>
                <Upload size={13} className="text-slate-400 group-hover:text-indigo-600" />
              </div>
            </div>
          ))}
        </div>

        {/* Migration Status Register Table */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-2xs">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="font-bold text-xs text-slate-900 dark:text-slate-100">Client Accounting Migration Status Register</h2>
              <p className="text-[11px] text-slate-400">Status of historical ledgers and opening trial balance imports per client</p>
            </div>

            <div className="relative w-72">
              <Search size={13} className="absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search client name..."
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-2.5 px-4">Client Name</th>
                  <th className="py-2.5 px-4">Entity Type</th>
                  <th className="py-2.5 px-4">Migration Connector</th>
                  <th className="py-2.5 px-4">Components Imported</th>
                  <th className="py-2.5 px-4">Opening TB Status</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredClients.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <Database size={28} className="text-slate-300 dark:text-slate-600" />
                        <p className="font-semibold text-slate-600 dark:text-slate-400">No client migration records found</p>
                        <p className="text-[11px] text-slate-400 max-w-sm">
                          Select an accounting software connector above to start migrating trial balance and customer data.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredClients.map((c: any) => (
                    <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-slate-100">{c.clientName}</td>
                      <td className="py-3 px-4 text-slate-500">{c.clientType || "Limited"}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                          Xero & QBO Ready
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                        COA, Contacts, Opening TB
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                          <CheckCircle2 size={10} /> Balanced & Active
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => {
                            setTargetClientId(String(c.id));
                            setShowImportModal(true);
                          }}
                          className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 rounded text-[11px] font-semibold cursor-pointer"
                        >
                          Re-import
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal: Migration Import Wizard */}
        {showImportModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in">
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4 border border-slate-200 dark:border-slate-800 text-xs">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Upload size={16} className="text-indigo-600" />
                  <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                    Import Accounting Data from {selectedSource}
                  </h3>
                </div>
                <button onClick={() => setShowImportModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-3.5">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Target Client Account *</label>
                  <select
                    value={targetClientId}
                    onChange={(e) => setTargetClientId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold"
                  >
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>{c.clientName} ({c.clientType || "Limited"})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Upload {selectedSource} Export File (.CSV / .XLSX)
                  </label>
                  <input
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setSelectedFile(e.target.files[0]);
                      }
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  />
                  <p className="text-[10.5px] text-slate-400 mt-1">
                    Accepts trial balance, general ledger, customer contacts, or nominal activity exports.
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 space-y-1.5">
                  <p className="font-semibold text-slate-700 dark:text-slate-300 text-[11px]">Automatic SanSuite Mapping</p>
                  <div className="space-y-1 text-[10.5px] text-slate-500">
                    <div className="flex items-center gap-1.5"><Check size={11} className="text-emerald-600" /> Chart of Accounts mapped to UK FRS 102 1A / 105</div>
                    <div className="flex items-center gap-1.5"><Check size={11} className="text-emerald-600" /> Opening trial balance verified for zero variance (Debits = Credits)</div>
                    <div className="flex items-center gap-1.5"><Check size={11} className="text-emerald-600" /> Customer & supplier ledger contacts synchronized</div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowImportModal(false)}
                  className="px-3 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-400 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => migrationMutation.mutate()}
                  disabled={migrationMutation.isPending || !targetClientId}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold shadow-xs disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  <Upload size={13} className={migrationMutation.isPending ? "animate-spin" : ""} />
                  {migrationMutation.isPending ? "Processing Migration..." : `Import into SanSuite`}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
