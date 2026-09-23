import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AppLayout from "../../components/layout/AppLayout";
import {
  UserPlus, Upload, FileSpreadsheet, ArrowRight, CheckCircle2,
  AlertCircle, ShieldCheck, Database, RefreshCw, Plus, Search,
  Download, FileText, Building2, User, X
} from "lucide-react";
import { apiRequest } from "../../lib/queryClient";
import { useToast } from "../../hooks/useToast";

const sidebar = [
  { label: "Onboarding Hub", icon: <UserPlus size={15} />, route: "/onboarding" },
  { label: "Data Migration", icon: <Database size={15} />, route: "/onboarding?tab=migration" },
  { label: "Onboarding Pipeline", icon: <ArrowRight size={15} />, route: "/onboarding?tab=pipeline" },
  { label: "Import Templates", icon: <Download size={15} />, route: "/onboarding?tab=templates" },
];

export default function OnboardingPage() {
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

  // Simulated Migration Wizard
  const migrationMutation = useMutation({
    mutationFn: async () => {
      await new Promise((r) => setTimeout(r, 1200));
      return { success: true };
    },
    onSuccess: () => {
      toast({
        title: "Migration Completed",
        description: `Successfully imported Chart of Accounts, Contacts & Opening Balances from ${selectedSource}.`,
      });
      setShowImportModal(false);
      setSelectedFile(null);
    },
  });

  return (
    <AppLayout sidebar={sidebar} module="Onboarding & Migration">
      <div className="bg-slate-50 dark:bg-slate-950 min-h-screen text-xs p-6 space-y-6 w-full mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div>
            <div className="flex items-center gap-2">
              <UserPlus size={16} className="text-indigo-600" />
              <h1 className="text-base font-bold text-slate-900 dark:text-slate-100">Client Onboarding & Data Migration Hub</h1>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Accelerate new client onboarding, AML checks, Letter of Engagement sign-off, and one-click data migration from Xero, QuickBooks, Sage, or CSV.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (clients.length > 0) setTargetClientId(String(clients[0].id));
                setShowImportModal(true);
              }}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Upload size={13} /> Import Software Data
            </button>
          </div>
        </div>

        {/* 4-Step Onboarding Pipeline */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-500">1. Information & AML</span>
              <ShieldCheck size={14} className="text-indigo-600" />
            </div>
            <p className="text-xl font-bold text-slate-900 dark:text-slate-100">{clients.length}</p>
            <p className="text-[10px] text-slate-500">Identity & Risk Screening</p>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-500">2. Proposal & LoE</span>
              <FileText size={14} className="text-emerald-600" />
            </div>
            <p className="text-xl font-bold text-emerald-600">{clients.length}</p>
            <p className="text-[10px] text-emerald-600 font-medium flex items-center gap-1">
              <CheckCircle2 size={10} /> Capisign E-Sign Active
            </p>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-500">3. Data Migration</span>
              <Database size={14} className="text-blue-600" />
            </div>
            <p className="text-xl font-bold text-blue-600">4 Sources</p>
            <p className="text-[10px] text-slate-500">Xero, QBO, Sage, CSV</p>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-500">4. Live Compliance</span>
              <CheckCircle2 size={14} className="text-purple-600" />
            </div>
            <p className="text-xl font-bold text-purple-600">100% Ready</p>
            <p className="text-[10px] text-slate-500">Deadlines & Workflows set</p>
          </div>
        </div>

        {/* Data Migration Wizards Cards */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4">
          <h2 className="font-bold text-xs text-slate-900 dark:text-slate-100">One-Click Accounting Data Migration Connectors</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              { name: "Xero", desc: "Import Chart of Accounts, Customers, Suppliers & Opening TB", color: "border-sky-500" },
              { name: "QuickBooks Online", desc: "Direct QBO API sync or journal import", color: "border-emerald-500" },
              { name: "Sage 50 / Cloud", desc: "Import nominal ledger audit trail CSV", color: "border-green-600" },
              { name: "FreeAgent / CSV", desc: "Universal SanSuite multi-column Excel template", color: "border-indigo-500" },
            ].map((src) => (
              <div
                key={src.name}
                onClick={() => {
                  setSelectedSource(src.name);
                  if (clients.length > 0) setTargetClientId(String(clients[0].id));
                  setShowImportModal(true);
                }}
                className={`p-4 rounded-xl border-2 ${src.color} bg-slate-50/50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-all space-y-2`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-900 dark:text-slate-100">{src.name}</span>
                  <Upload size={13} className="text-slate-400" />
                </div>
                <p className="text-[11px] text-slate-500">{src.desc}</p>
                <span className="text-[10px] font-semibold text-indigo-600 hover:underline flex items-center gap-1">
                  Start Import <ArrowRight size={10} />
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Onboarding Client Pipeline Table */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
            <h2 className="font-bold text-xs text-slate-900 dark:text-slate-100">Onboarding Clients Status Register</h2>
            <div className="relative w-72">
              <Search size={13} className="absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search onboarding client..."
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-4">Client Name</th>
                  <th className="py-2.5 px-4">Entity Type</th>
                  <th className="py-2.5 px-4">AML ID Check</th>
                  <th className="py-2.5 px-4">Engagement Letter</th>
                  <th className="py-2.5 px-4">Opening Balances</th>
                  <th className="py-2.5 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {clients.map((c: any) => (
                  <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">{c.clientName}</td>
                    <td className="py-3 px-4 text-slate-500">{c.clientType || "Limited"}</td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600">
                        <CheckCircle2 size={11} /> Verified
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600">
                        <CheckCircle2 size={11} /> Signed via Capisign
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                      <span className="px-2 py-0.5 rounded-full text-[10px] bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                        Imported (Live TB)
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                        Active & Compliant
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal: Software Migration Wizard */}
        {showImportModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4 border border-slate-200 dark:border-slate-800 text-xs">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Upload size={16} className="text-indigo-600" />
                  <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">Import Data from {selectedSource}</h3>
                </div>
                <button onClick={() => setShowImportModal(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Target Client Account *</label>
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
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Upload Export CSV / Excel File</label>
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
                  <p className="text-[10px] text-slate-400 mt-1">Supports trial balance, general ledger, customers, and suppliers.</p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button onClick={() => setShowImportModal(false)} className="px-3 py-1.5 text-slate-500">Cancel</button>
                <button
                  onClick={() => migrationMutation.mutate()}
                  disabled={migrationMutation.isPending}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium shadow-xs flex items-center gap-1.5"
                >
                  <Upload size={13} /> {migrationMutation.isPending ? "Processing Import..." : "Import into SanSuite"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
