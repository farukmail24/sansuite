import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import ClientWorkspaceLayout, { useClientWorkspace } from "./ClientWorkspaceLayout";
import { apiRequest } from "../../../lib/queryClient";
import { useToast } from "../../../hooks/useToast";
import { Users, Plus, Trash2, RefreshCw, X, ShieldCheck, Calendar, User, Building2 } from "lucide-react";
import { PipelineFooterNav } from "./AccountsProductionPipeline";

export default function DirectorsWorkspacePage() {
  return (
    <ClientWorkspaceLayout activeSection="Update CH Directors">
      <DirectorsWorkspaceContent />
    </ClientWorkspaceLayout>
  );
}

function DirectorsWorkspaceContent() {
  const { clientId, client } = useClientWorkspace();
  const { toast } = useToast();

  const [showAddDirectorModal, setShowAddDirectorModal] = useState(false);
  const [dirName, setDirName] = useState("");
  const [dirRole, setDirRole] = useState("Director");
  const [dirAppointedOn, setDirAppointedOn] = useState(new Date().toISOString().split("T")[0]);
  const [dirIsSignatory, setDirIsSignatory] = useState(true);

  const { data: directors = [], isLoading, refetch: refetchDirectors } = useQuery<any[]>({
    queryKey: [`/api/accounts-production/${clientId}/ch-directors`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/accounts-production/${clientId}/ch-directors`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!clientId,
  });

  const addDirectorMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/accounts-production/${clientId}/ch-directors`, {
        officerName: dirName.trim(),
        officerRole: dirRole,
        appointedDate: dirAppointedOn,
        isSignatoryOnAccounts: dirIsSignatory,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to add officer");
      }
      return res.json();
    },
    onSuccess: () => {
      refetchDirectors();
      setShowAddDirectorModal(false);
      setDirName("");
      toast({ title: "Officer Added", description: "Director registered on accounts production records." });
    },
    onError: (err: any) => {
      toast({ title: "Failed to Add Officer", description: err.message || "Error adding director.", variant: "destructive" });
    }
  });

  const deleteDirectorMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/accounts-production/${clientId}/ch-directors/${id}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to remove officer");
      }
      return res.json();
    },
    onSuccess: () => {
      refetchDirectors();
      toast({ title: "Officer Removed" });
    },
    onError: (err: any) => {
      toast({ title: "Failed to Remove Officer", description: err.message, variant: "destructive" });
    }
  });

  const syncChDirectorsMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/accounts-production/${clientId}/ch-directors/sync-ch`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to sync directors from Companies House");
      }
      return res.json();
    },
    onSuccess: (data: any) => {
      refetchDirectors();
      toast({
        title: "Directors Synchronized",
        description: data.message || "Active directors imported from Companies House.",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Companies House Sync Failed",
        description: err.message || "Could not retrieve officers from Companies House.",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 gap-3">
        <div>
          <h2 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Users size={16} className="text-indigo-600" />
            Company Directors &amp; Officers Registry
          </h2>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Manage signatories and officers for {client?.clientName} balance sheet sign-off under Companies Act 2006.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {client?.registrationNumber && (
            <button
              onClick={() => syncChDirectorsMutation.mutate()}
              disabled={syncChDirectorsMutation.isPending}
              className="px-3.5 py-1.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg font-medium text-xs flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50 transition-colors"
              title={`Import active directors directly from Companies House (CRN: ${client.registrationNumber})`}
            >
              <RefreshCw size={12} className={syncChDirectorsMutation.isPending ? "animate-spin text-indigo-600" : "text-indigo-600"} />
              {syncChDirectorsMutation.isPending ? "Importing..." : "Import from Companies House"}
            </button>
          )}
          <button
            onClick={() => setShowAddDirectorModal(true)}
            className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium text-xs flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
          >
            <Plus size={13} /> Add Director
          </button>
        </div>
      </div>

      <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
        {isLoading ? (
          <div className="p-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
            <RefreshCw size={14} className="animate-spin text-indigo-600" />
            <span>Loading company officers...</span>
          </div>
        ) : directors.length === 0 ? (
          <div className="py-10 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 mx-auto flex items-center justify-center">
              <Users size={22} />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">No Officers or Signatories Registered</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1">
                Under the Companies Act 2006, annual accounts and the balance sheet must be signed by at least one authorized director.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2 flex-wrap">
              {client?.registrationNumber && (
                <button
                  onClick={() => syncChDirectorsMutation.mutate()}
                  disabled={syncChDirectorsMutation.isPending}
                  className="px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                >
                  <RefreshCw size={13} className={syncChDirectorsMutation.isPending ? "animate-spin text-indigo-600" : "text-indigo-600"} />
                  {syncChDirectorsMutation.isPending ? "Importing..." : `Import from Companies House (${client.registrationNumber})`}
                </button>
              )}
              <button
                onClick={() => setShowAddDirectorModal(true)}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Plus size={13} /> Add Director Manually
              </button>
            </div>
          </div>
        ) : (
          directors.map((dir: any) => {
            const name = dir.officerName || dir.name;
            const role = dir.officerRole || dir.role || "Director";
            const appDate = dir.appointedDate || dir.appointedOn;
            const isSignatory = dir.isSignatoryOnAccounts !== undefined ? dir.isSignatoryOnAccounts : (dir.isSignatory !== undefined ? dir.isSignatory : true);

            return (
              <div key={dir.id} className="py-3 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-slate-900 dark:text-slate-100">{name}</p>
                  <p className="text-slate-400 text-[11px]">
                    {role} &bull; Appointed: {appDate ? new Date(appDate).toLocaleDateString("en-GB") : "Active"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {isSignatory && (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 flex items-center gap-1">
                      <ShieldCheck size={10} /> Signatory
                    </span>
                  )}
                  <button
                    onClick={() => deleteDirectorMutation.mutate(dir.id)}
                    className="text-slate-400 hover:text-rose-600 p-1 rounded cursor-pointer transition-colors"
                    title="Remove director"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal: Add Director */}
      {showAddDirectorModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4 border border-slate-200 dark:border-slate-800 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">Add Company Officer</h3>
              <button onClick={() => setShowAddDirectorModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Full Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Johnathan Smith"
                  value={dirName}
                  onChange={(e) => setDirName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Role</label>
                  <select
                    value={dirRole}
                    onChange={(e) => setDirRole(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  >
                    <option value="Director">Director</option>
                    <option value="Secretary">Company Secretary</option>
                    <option value="Partner">Partner</option>
                    <option value="Designated Member">Designated Member (LLP)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Appointed Date</label>
                  <input
                    type="date"
                    value={dirAppointedOn}
                    onChange={(e) => setDirAppointedOn(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="dirIsSignatory"
                  checked={dirIsSignatory}
                  onChange={(e) => setDirIsSignatory(e.target.checked)}
                  className="rounded text-indigo-600 cursor-pointer"
                />
                <label htmlFor="dirIsSignatory" className="font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                  Authorised Signatory on Balance Sheet
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800 pt-3">
              <button
                type="button"
                onClick={() => setShowAddDirectorModal(false)}
                className="px-3 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!dirName.trim() || addDirectorMutation.isPending}
                onClick={() => addDirectorMutation.mutate()}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {addDirectorMutation.isPending ? "Adding..." : "Add Officer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Pipeline Navigation */}
      <PipelineFooterNav
        clientId={clientId}
        currentStepSlug="officers"
        statusNotice={directors.length > 0 ? `${directors.length} Officer(s) Registered` : "Add company officers to proceed"}
      />
    </div>
  );
}
