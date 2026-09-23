import { useState, useEffect, useMemo } from "react";
import { useLocation, useRoute } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AppLayout from "../../../components/layout/AppLayout";
import { bookkeepingSidebar, getClientSidebar } from "../sidebar";
import SettingsTabs from "../../../components/bookkeeping/SettingsTabs";
import { apiRequest } from "../../../lib/queryClient";
import { useToast } from "../../../hooks/useToast";
import {
  ChevronRight,
  Building2,
  Hash,
  Save,
  Building,
} from "lucide-react";

export default function CustomiseSequencePage() {
  const [match1, params1] = useRoute("/bookkeeping/:id/customise-sequence");
  const [match2, params2] = useRoute("/bookkeeping/:id/*");
  const rawClientId = params1?.id || params2?.id || "";

  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: clients = [] } = useQuery<any[]>({
    queryKey: ["/api/practice/clients"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/practice/clients");
      return res.ok ? res.json() : [];
    },
  });

  const effectiveClientId = useMemo(() => {
    if (rawClientId) return rawClientId;
    if (clients.length > 0) return String(clients[0].id);
    return "";
  }, [rawClientId, clients]);

  const activeClient = useMemo(() => {
    return clients.find((c: any) => String(c.id) === String(effectiveClientId));
  }, [clients, effectiveClientId]);

  const [sequencesState, setSequencesState] = useState<any[]>([]);

  const { data: sequencesData = [] } = useQuery<any[]>({
    queryKey: [`/api/bookkeeping/settings/${effectiveClientId}/sequences`],
    queryFn: async () => {
      if (!effectiveClientId) return [];
      const res = await apiRequest("GET", `/api/bookkeeping/settings/${effectiveClientId}/sequences`);
      return res.ok ? res.json() : [];
    },
    enabled: !!effectiveClientId,
  });

  useEffect(() => {
    if (sequencesData.length > 0) {
      setSequencesState(sequencesData);
    }
  }, [sequencesData]);

  const updateSequenceRow = (index: number, field: string, value: any) => {
    const updated = [...sequencesState];
    updated[index] = { ...updated[index], [field]: value };
    setSequencesState(updated);
  };

  const saveSequencesMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/bookkeeping/settings/${effectiveClientId}/sequences`, {
        sequences: sequencesState,
      });
      if (!res.ok) throw new Error("Failed to save sequence configuration");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/bookkeeping/settings/${effectiveClientId}/sequences`] });
      toast({ title: "Sequences Saved", description: "Transaction sequence formats updated successfully." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  return (
    <AppLayout
      sidebar={effectiveClientId ? getClientSidebar(effectiveClientId) : bookkeepingSidebar}
      module="Bookkeeping"
    >
      <div className="bg-slate-50 min-h-screen pb-16">
        {/* Navigation Breadcrumb & Client Switcher */}
        <div className="bg-white px-6 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-10 shadow-2xs">
          <div className="flex items-center text-xs text-slate-500 gap-2">
            <button
              type="button"
              onClick={() => navigate("/bookkeeping")}
              className="hover:text-purple-600 font-semibold transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Building2 size={13} />
              <span>Bookkeeping</span>
            </button>
            <ChevronRight size={13} className="text-slate-400" />
            <span className="text-slate-700 font-medium">Settings</span>
            <ChevronRight size={13} className="text-slate-400" />
            <span className="font-bold text-purple-700">Customise Sequence</span>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
              <Building size={14} className="text-purple-600" />
              <span>Client:</span>
            </label>
            <select
              value={effectiveClientId}
              onChange={(e) => navigate(`/bookkeeping/${e.target.value}/customise-sequence`)}
              className="border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-800 bg-white shadow-2xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
            >
              {clients.map((c: any) => (
                <option key={c.id} value={c.id}>
                  {c.clientName || c.companyName || `Client #${c.id}`} ({c.companyType || c.clientType || "Business"})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="p-6 max-full mx-auto space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-slate-900 tracking-tight">
                  Customise Sequence
                </h1>
                {activeClient && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
                    {activeClient.clientName}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Configure prefixes, starting numbering indices, and postfix formatting for all 11 financial document types.
              </p>
            </div>
          </div>

          <SettingsTabs activeTab="sequence" clientId={effectiveClientId} />

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Transaction Number Sequences</h3>
              <p className="text-xs text-slate-500">
                Define custom prefix, sequential starting index number, and postfix for all financial document types.
              </p>
            </div>
            <button
              type="button"
              onClick={() => saveSequencesMutation.mutate()}
              disabled={saveSequencesMutation.isPending}
              className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs shadow-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
            >
              <Save size={14} />
              <span>{saveSequencesMutation.isPending ? "Saving..." : "Save Sequences"}</span>
            </button>
          </div>

          {/* Sequences Table */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold">
                    <th className="py-3 px-4 w-1/3">Transaction Type</th>
                    <th className="py-3 px-4 w-40">Prefix</th>
                    <th className="py-3 px-4 w-40">Starting Serial Number</th>
                    <th className="py-3 px-4 w-40">Postfix</th>
                    <th className="py-3 px-4 text-right">Generated Preview</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sequencesState.map((seq, idx) => {
                    const preview = `${seq.prefix || ""}${seq.startNumber || 1}${seq.postfix || ""}`;
                    return (
                      <tr key={idx} className="hover:bg-slate-50/40 transition-colors">
                        <td className="py-3 px-4 font-bold text-slate-800 flex items-center gap-2">
                          <Hash size={14} className="text-purple-600" />
                          <span>{seq.transactionType}</span>
                        </td>
                        <td className="py-2 px-4">
                          <input
                            type="text"
                            value={seq.prefix || ""}
                            onChange={(e) => updateSequenceRow(idx, "prefix", e.target.value)}
                            placeholder="e.g. INV-"
                            className="w-full border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-mono font-bold text-slate-800 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                          />
                        </td>
                        <td className="py-2 px-4">
                          <input
                            type="number"
                            min="1"
                            value={seq.startNumber || 1}
                            onChange={(e) => updateSequenceRow(idx, "startNumber", parseInt(e.target.value) || 1)}
                            className="w-full border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-mono font-bold text-slate-800 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                          />
                        </td>
                        <td className="py-2 px-4">
                          <input
                            type="text"
                            value={seq.postfix || ""}
                            onChange={(e) => updateSequenceRow(idx, "postfix", e.target.value)}
                            placeholder="e.g. /26"
                            className="w-full border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-mono font-bold text-slate-800 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                          />
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className="font-mono font-bold px-3 py-1 bg-purple-50 text-purple-700 border border-purple-200 rounded-lg text-xs">
                            {preview}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
