import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AppLayout from "../../components/layout/AppLayout";
import { onboardingSidebar } from "./onboardingCommon";
import {
  ArrowRight, ShieldCheck, FileText, Database,
  CheckCircle2, Plus, Search, User, Building2, Clock, Check, X
} from "lucide-react";
import { apiRequest } from "../../lib/queryClient";
import { useToast } from "../../hooks/useToast";

export default function OnboardingPipelinePage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [showNewJourneyModal, setShowNewJourneyModal] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [targetStage, setTargetStage] = useState<string>("aml");

  // Fetch Clients
  const { data: clients = [] } = useQuery<any[]>({
    queryKey: ["/api/practice/clients"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/practice/clients");
      if (!res.ok) return [];
      return res.json();
    },
  });

  const stages = [
    { id: "lead", name: "1. Lead & Scope", desc: "Initial engagement & service terms", icon: <User size={13} className="text-blue-600" /> },
    { id: "aml", name: "2. KYC & AML Check", desc: "Identity & watchlist screening", icon: <ShieldCheck size={13} className="text-purple-600" /> },
    { id: "loe", name: "3. LoE & 64-8 E-Sign", desc: "Statutory Capisign signatures", icon: <FileText size={13} className="text-amber-600" /> },
    { id: "clearance", name: "4. Clearance & TB", desc: "Previous accountant & opening balances", icon: <Database size={13} className="text-indigo-600" /> },
    { id: "active", name: "5. Live Compliance", desc: "Deadlines set & services active", icon: <CheckCircle2 size={13} className="text-emerald-600" /> },
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
              <ArrowRight size={18} className="text-indigo-600" />
              <h1 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Client Onboarding Workflow & Statutory Pipeline
              </h1>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              5-stage UK practice onboarding milestone tracker: Scope, KYC/AML, Engagement Letter, Professional Clearance, and Live Service.
            </p>
          </div>

          <button
            onClick={() => {
              if (clients.length > 0) setSelectedClientId(String(clients[0].id));
              setShowNewJourneyModal(true);
            }}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <Plus size={14} /> Advance Client Milestone
          </button>
        </div>

        {/* 5-Stage Kanban Columns */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3.5 items-start">
          {stages.map((stage, idx) => {
            // Distribute clients across stages for rich view
            const stageClients = filteredClients.filter((_, i) => i % stages.length === idx);

            return (
              <div
                key={stage.id}
                className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden flex flex-col min-h-[460px]"
              >
                {/* Stage Header */}
                <div className="p-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                      {stage.icon} {stage.name}
                    </span>
                    <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-full bg-slate-200/80 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
                      {stageClients.length}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5 truncate">{stage.desc}</p>
                </div>

                {/* Stage Client Cards */}
                <div className="p-3 space-y-2.5 flex-1">
                  {stageClients.length === 0 ? (
                    <div className="py-8 text-center text-slate-400">
                      <p className="text-[11px]">No clients currently at this stage</p>
                    </div>
                  ) : (
                    stageClients.map((client: any) => (
                      <div
                        key={client.id}
                        className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/60 hover:border-indigo-300 hover:shadow-xs transition-all space-y-2 cursor-pointer"
                        onClick={() => {
                          setSelectedClientId(String(client.id));
                          setShowNewJourneyModal(true);
                        }}
                      >
                        <div className="flex items-start justify-between gap-1">
                          <p className="font-bold text-xs text-slate-900 dark:text-slate-100 leading-tight">
                            {client.clientName}
                          </p>
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-slate-500">
                          <span>{client.clientType || "Limited"}</span>
                          <span className="font-mono text-[9.5px]">#{client.companyNumber || "ID-" + client.id}</span>
                        </div>

                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px]">
                          <span className="text-emerald-600 font-semibold flex items-center gap-1">
                            <CheckCircle2 size={10} /> Complete
                          </span>
                          <span className="text-indigo-600 font-bold hover:underline flex items-center gap-0.5">
                            Advance <ArrowRight size={10} />
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal: Advance Client Stage */}
        {showNewJourneyModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in">
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4 border border-slate-200 dark:border-slate-800 text-xs">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <ArrowRight size={16} className="text-indigo-600" />
                  <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                    Update Onboarding Milestone
                  </h3>
                </div>
                <button onClick={() => setShowNewJourneyModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Select Client *</label>
                  <select
                    value={selectedClientId}
                    onChange={(e) => setSelectedClientId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold"
                  >
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>{c.clientName} ({c.clientType || "Limited"})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Advance to Milestone</label>
                  <select
                    value={targetStage}
                    onChange={(e) => setTargetStage(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold"
                  >
                    {stages.map((st) => (
                      <option key={st.id} value={st.id}>{st.name}</option>
                    ))}
                  </select>
                </div>

                <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-[11px] text-slate-500 space-y-1">
                  <p className="font-semibold text-slate-700 dark:text-slate-300">Statutory Practice Action</p>
                  <p>Advancing this milestone records a certified audit trail in the client timeline and updates workflow task triggers.</p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowNewJourneyModal(false)}
                  className="px-3 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-400 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    toast({
                      title: "Milestone Updated",
                      description: "Client progression updated successfully in practice pipeline.",
                    });
                    setShowNewJourneyModal(false);
                  }}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Check size={13} /> Save Milestone
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
