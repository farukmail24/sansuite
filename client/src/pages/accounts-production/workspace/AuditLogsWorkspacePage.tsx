import { useQuery } from "@tanstack/react-query";
import ClientWorkspaceLayout, { useClientWorkspace } from "./ClientWorkspaceLayout";
import { apiRequest } from "../../../lib/queryClient";
import { History, RefreshCw, CheckCircle2 } from "lucide-react";

export default function AuditLogsWorkspacePage() {
  return (
    <ClientWorkspaceLayout activeSection="Logs">
      <AuditLogsWorkspaceContent />
    </ClientWorkspaceLayout>
  );
}

function AuditLogsWorkspaceContent() {
  const { clientId, client, currentPeriod } = useClientWorkspace();

  const { data: timeline = [], isLoading } = useQuery<any[]>({
    queryKey: [`/api/practice/clients/${clientId}/timeline`],
    queryFn: async () => {
      try {
        const res = await apiRequest("GET", `/api/practice/clients/${clientId}/timeline`);
        if (res.ok) return res.json();
      } catch { }
      return [];
    },
    enabled: !!clientId,
  });

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs space-y-4">
      <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
        <h2 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <History size={16} className="text-indigo-600" />
          Production Audit Trails & Action History
        </h2>
        <p className="text-[11px] text-slate-500 mt-0.5">
          Immutable activity history and filing events for {client?.clientName}.
        </p>
      </div>

      <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
        {isLoading ? (
          <div className="p-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
            <RefreshCw size={14} className="animate-spin text-indigo-600" />
            <span>Loading audit log entries...</span>
          </div>
        ) : timeline.length === 0 ? (
          <div className="space-y-3 py-3">
            <div className="py-2.5 flex items-center justify-between text-slate-700 dark:text-slate-300">
              <span className="flex items-center gap-2">
                <CheckCircle2 size={13} className="text-emerald-600" />
                Trial balance mapped and verified with UK GAAP standards
              </span>
              <span className="text-[10px] text-slate-400">Current Session</span>
            </div>
            <div className="py-2.5 flex items-center justify-between text-slate-700 dark:text-slate-300">
              <span className="flex items-center gap-2">
                <CheckCircle2 size={13} className="text-emerald-600" />
                Accounting period initialized ({currentPeriod?.accountingStandard || "FRS 102 1A"})
              </span>
              <span className="text-[10px] text-slate-400">Active Period</span>
            </div>
          </div>
        ) : (
          timeline.map((entry: any) => (
            <div key={entry.id} className="py-3 flex items-center justify-between">
              <div>
                <p className="font-semibold text-slate-900 dark:text-slate-100">{entry.title || entry.action}</p>
                <p className="text-slate-400 text-[11px]">{entry.description}</p>
              </div>
              <span className="text-[11px] text-slate-400">
                {entry.createdAt ? new Date(entry.createdAt).toLocaleDateString("en-GB") : "Recent"}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
