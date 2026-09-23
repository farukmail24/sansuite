import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Users, Plus, Search, ShieldCheck, CheckCircle2, AlertCircle,
  Briefcase, Building2, Globe, Edit2, Trash2, ExternalLink, RefreshCw, X
} from "lucide-react";
import { apiRequest } from "../../lib/queryClient";
import { useToast } from "../../hooks/useToast";
import { MtdClientRecord, MtdSourceRecord } from "./types";

export default function MtdItClientsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClientIds, setSelectedClientIds] = useState<number[]>([]);
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [managingClient, setManagingClient] = useState<MtdClientRecord | null>(null);
  const [showAddSourceModal, setShowAddSourceModal] = useState(false);

  // Enroll client form
  const [enrollForm, setEnrollForm] = useState({
    clientId: "",
    utrNumber: "",
    nino: "",
    calendarType: "standard",
    reportingMethod: "three_line",
    createDefaultSource: true,
    defaultSourceType: "self-employment",
    defaultSourceName: "Main Trade",
  });

  // Add source form
  const [sourceForm, setSourceForm] = useState({
    sourceType: "self-employment" as "self-employment" | "uk-property" | "foreign-property",
    tradingName: "",
    accountingType: "Cash basis",
    workflowType: "workflow_1_bridging",
    calendarType: "standard",
    reportingMethod: "three_line",
    sharedOwnershipPct: "100.00",
    addressLine1: "",
    postalCode: "",
  });

  // Fetch MTD enrolled clients
  const { data: mtdClients = [], isLoading: isLoadingMtd } = useQuery<MtdClientRecord[]>({
    queryKey: ["/api/mtd-it/clients"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/mtd-it/clients");
      return res.json();
    },
  });

  // Fetch practice registered clients for dropdown
  const { data: practiceClients = [] } = useQuery<any[]>({
    queryKey: ["/api/practice/clients"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/practice/clients");
      if (!res.ok) return [];
      return res.json();
    },
  });

  // Enroll Mutation
  const enrollMutation = useMutation({
    mutationFn: async (data: typeof enrollForm) => {
      const res = await apiRequest("POST", "/api/mtd-it/clients", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/mtd-it/clients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/mtd-it/submissions/dashboard"] });
      setShowEnrollModal(false);
      setEnrollForm({
        clientId: "",
        utrNumber: "",
        nino: "",
        calendarType: "standard",
        reportingMethod: "three_line",
        createDefaultSource: true,
        defaultSourceType: "self-employment",
        defaultSourceName: "Main Trade",
      });
      toast({ title: "Client Enrolled", description: "Client successfully enrolled into MTD for Income Tax." });
    },
    onError: (err: any) => {
      toast({ title: "Enrollment Failed", description: err.message, variant: "destructive" });
    },
  });

  // Bulk Authorise Mutation
  const bulkAuthoriseMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      const res = await apiRequest("POST", "/api/mtd-it/clients/bulk-authorise", { clientIds: ids });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/mtd-it/clients"] });
      setSelectedClientIds([]);
      toast({ title: "Bulk Authorisation Successful", description: `Authorised ${data.count} clients with HMRC ASA.` });
    },
  });

  // Add Source Mutation
  const addSourceMutation = useMutation({
    mutationFn: async () => {
      if (!managingClient) return;
      const res = await apiRequest("POST", "/api/mtd-it/sources", {
        clientId: managingClient.clientId,
        mtdClientId: managingClient.id,
        ...sourceForm,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/mtd-it/clients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/mtd-it/submissions/dashboard"] });
      setShowAddSourceModal(false);
      toast({ title: "Source Added", description: "New income source successfully attached to client." });
    },
  });

  // Delete Source Mutation
  const deleteSourceMutation = useMutation({
    mutationFn: async (sourceId: number) => {
      const res = await apiRequest("DELETE", `/api/mtd-it/sources/${sourceId}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/mtd-it/clients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/mtd-it/submissions/dashboard"] });
      toast({ title: "Source Removed", description: "Income source marked inactive." });
    },
  });

  const filteredClients = mtdClients.filter(
    (c) =>
      c.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.clientCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.utrNumber?.includes(searchTerm) ||
      c.nino?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleSelectAll = () => {
    if (selectedClientIds.length === filteredClients.length) {
      setSelectedClientIds([]);
    } else {
      setSelectedClientIds(filteredClients.map((c) => c.id));
    }
  };

  const toggleSelectClient = (id: number) => {
    if (selectedClientIds.includes(id)) {
      setSelectedClientIds(selectedClientIds.filter((cid) => cid !== id));
    } else {
      setSelectedClientIds([...selectedClientIds, id]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <div className="relative w-full sm:max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search clients, UTR, or NINO..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-[#6c5ce7] bg-white"
          />
        </div>

        <div className="flex items-center gap-2">
          {selectedClientIds.length > 0 && (
            <button
              onClick={() => bulkAuthoriseMutation.mutate(selectedClientIds)}
              disabled={bulkAuthoriseMutation.isPending}
              className="px-3.5 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 flex items-center gap-1.5 transition-colors"
            >
              <ShieldCheck size={14} /> Bulk Authorise ASA ({selectedClientIds.length})
            </button>
          )}
          <button
            onClick={() => setShowEnrollModal(true)}
            className="px-4 py-2 text-xs font-semibold text-white bg-[#6c5ce7] hover:bg-[#5b4bc4] rounded-lg shadow-sm flex items-center gap-1.5 transition-colors"
          >
            <Plus size={14} /> Enroll Client in MTD IT
          </button>
        </div>
      </div>

      {/* Clients Grid */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {isLoadingMtd ? (
          <div className="text-center py-12 text-sm text-gray-500">Loading enrolled clients...</div>
        ) : filteredClients.length === 0 ? (
          <div className="text-center py-16 px-4 bg-gray-50/50">
            <Users size={36} className="mx-auto text-gray-400 mb-3" />
            <h4 className="text-sm font-bold text-gray-800">No Enrolled MTD IT Clients</h4>
            <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1 mb-4">
              Enroll your practice sole traders and property landlords to configure their income sources and manage quarterly obligations.
            </p>
            <button
              onClick={() => setShowEnrollModal(true)}
              className="px-4 py-2 text-xs font-semibold text-white bg-[#6c5ce7] hover:bg-[#5b4bc4] rounded-lg shadow-sm inline-flex items-center gap-1.5"
            >
              <Plus size={14} /> Enroll First Client
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3 w-10">
                    <input
                      type="checkbox"
                      checked={selectedClientIds.length === filteredClients.length && filteredClients.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded text-[#6c5ce7]"
                    />
                  </th>
                  <th className="px-4 py-3">Client Code / Name</th>
                  <th className="px-4 py-3">UTR No.</th>
                  <th className="px-4 py-3">NINO</th>
                  <th className="px-4 py-3">Income Sources</th>
                  <th className="px-4 py-3">Calendar Basis</th>
                  <th className="px-4 py-3">Reporting Method</th>
                  <th className="px-4 py-3">ASA Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredClients.map((client) => (
                  <tr key={client.id} className="hover:bg-gray-50/70">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedClientIds.includes(client.id)}
                        onChange={() => toggleSelectClient(client.id)}
                        className="rounded text-[#6c5ce7]"
                      />
                    </td>
                    <td className="px-4 py-3 font-semibold text-gray-900">
                      <div>
                        <span className="text-[#6c5ce7] font-mono mr-1.5">{client.clientCode || "CL"}</span>
                        {client.clientName}
                      </div>
                      <span className="text-[10px] text-gray-400 block mt-0.5">{client.clientType}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 font-mono">{client.utrNumber || "—"}</td>
                    <td className="px-4 py-3 text-gray-600 font-mono">{client.nino || "—"}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setManagingClient(client)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-indigo-50 text-[#6c5ce7] hover:bg-indigo-100 font-medium transition-colors"
                      >
                        <Briefcase size={12} /> {client.sourcesCount || 0} Source{client.sourcesCount === 1 ? "" : "s"}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-gray-700 capitalize">
                      {client.calendarType === "calendar" ? "Calendar (1 Apr)" : "Standard (6 Apr)"}
                    </td>
                    <td className="px-4 py-3 text-gray-700 capitalize">
                      {client.reportingMethod === "three_line" ? "Three-Line" : "Detailed"}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded border border-green-200">
                        <CheckCircle2 size={12} /> {client.asaStatus || "Authorised"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setManagingClient(client)}
                        className="text-xs font-semibold text-[#6c5ce7] hover:underline"
                      >
                        Manage Sources
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Enroll Client in MTD IT */}
      {showEnrollModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-gray-200 max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-200 pb-3">
              <h3 className="text-base font-bold text-gray-800">Enroll Client into MTD for Income Tax</h3>
              <button onClick={() => setShowEnrollModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Select Practice Client</label>
                <select
                  className="w-full p-2 border border-gray-300 rounded-lg"
                  value={enrollForm.clientId}
                  onChange={(e) => {
                    const c = practiceClients.find((p) => p.id === parseInt(e.target.value, 10));
                    setEnrollForm({
                      ...enrollForm,
                      clientId: e.target.value,
                      utrNumber: c?.utrNumber || "",
                      nino: c?.niNumber || "",
                      defaultSourceName: c?.clientName || "Main Trade",
                    });
                  }}
                >
                  <option value="">-- Choose Client --</option>
                  {practiceClients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.clientCode ? `[${c.clientCode}] ` : ""}
                      {c.clientName} ({c.clientType})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Unique Taxpayer Reference (UTR)</label>
                  <input
                    type="text"
                    placeholder="10-digit UTR"
                    className="w-full p-2 border border-gray-300 rounded-lg font-mono"
                    value={enrollForm.utrNumber}
                    onChange={(e) => setEnrollForm({ ...enrollForm, utrNumber: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">National Insurance No (NINO)</label>
                  <input
                    type="text"
                    placeholder="QQ 12 34 56 A"
                    className="w-full p-2 border border-gray-300 rounded-lg font-mono"
                    value={enrollForm.nino}
                    onChange={(e) => setEnrollForm({ ...enrollForm, nino: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Calendar Basis</label>
                  <select
                    className="w-full p-2 border border-gray-300 rounded-lg"
                    value={enrollForm.calendarType}
                    onChange={(e) => setEnrollForm({ ...enrollForm, calendarType: e.target.value })}
                  >
                    <option value="standard">Standard HMRC (6 Apr - 5 Apr)</option>
                    <option value="calendar">Calendar Basis (1 Apr - 31 Mar)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Default Reporting Format</label>
                  <select
                    className="w-full p-2 border border-gray-300 rounded-lg"
                    value={enrollForm.reportingMethod}
                    onChange={(e) => setEnrollForm({ ...enrollForm, reportingMethod: e.target.value })}
                  >
                    <option value="three_line">Three-Line Accounting (Turnover &lt; £90k)</option>
                    <option value="detailed">Detailed Itemized Breakdown</option>
                  </select>
                </div>
              </div>

              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="create-src"
                    checked={enrollForm.createDefaultSource}
                    onChange={(e) => setEnrollForm({ ...enrollForm, createDefaultSource: e.target.checked })}
                    className="rounded text-[#6c5ce7]"
                  />
                  <label htmlFor="create-src" className="font-semibold text-gray-800">
                    Automatically create initial income source
                  </label>
                </div>

                {enrollForm.createDefaultSource && (
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-[11px] font-medium text-gray-600 mb-1">Source Type</label>
                      <select
                        className="w-full p-1.5 border border-gray-300 rounded bg-white"
                        value={enrollForm.defaultSourceType}
                        onChange={(e) => setEnrollForm({ ...enrollForm, defaultSourceType: e.target.value })}
                      >
                        <option value="self-employment">Sole Trader (Self-Employment)</option>
                        <option value="uk-property">UK Property Business</option>
                        <option value="foreign-property">Foreign Property</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-gray-600 mb-1">Trading Name</label>
                      <input
                        type="text"
                        className="w-full p-1.5 border border-gray-300 rounded bg-white"
                        value={enrollForm.defaultSourceName}
                        onChange={(e) => setEnrollForm({ ...enrollForm, defaultSourceName: e.target.value })}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-gray-200">
              <button
                onClick={() => setShowEnrollModal(false)}
                className="px-4 py-2 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={() => enrollMutation.mutate(enrollForm)}
                disabled={!enrollForm.clientId || enrollMutation.isPending}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#6c5ce7] hover:bg-[#5b4bc4] rounded-lg shadow-sm disabled:opacity-50"
              >
                {enrollMutation.isPending ? "Enrolling..." : "Enroll Client"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Manage Client Sources */}
      {managingClient && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-gray-200 max-w-2xl w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-200 pb-3">
              <div>
                <h3 className="text-base font-bold text-gray-800">Income Sources: {managingClient.clientName}</h3>
                <p className="text-xs text-gray-500">Manage multiple businesses and property operations for this individual.</p>
              </div>
              <button onClick={() => setManagingClient(null)} className="text-gray-400 hover:text-gray-600">
                <X size={16} />
              </button>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-600 font-medium">Registered Sources ({managingClient.sources?.length || 0})</span>
              <button
                onClick={() => setShowAddSourceModal(true)}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-[#6c5ce7] hover:bg-[#5b4bc4] rounded-lg flex items-center gap-1.5"
              >
                <Plus size={13} /> Add Income Source
              </button>
            </div>

            {managingClient.sources?.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                <p className="text-xs text-gray-500">No income sources configured yet.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {managingClient.sources?.map((src) => (
                  <div key={src.id} className="p-3 bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white rounded border border-gray-200 text-[#6c5ce7]">
                        {src.sourceType === "uk-property" ? (
                          <Building2 size={16} />
                        ) : src.sourceType === "foreign-property" ? (
                          <Globe size={16} />
                        ) : (
                          <Briefcase size={16} />
                        )}
                      </div>
                      <div>
                        <span className="text-xs font-bold text-gray-900 block">{src.tradingName}</span>
                        <span className="text-[11px] text-gray-500 block">
                          Type: <strong className="capitalize">{src.sourceType.replace("-", " ")}</strong> | Basis:{" "}
                          <strong>{src.accountingType}</strong> | Share: <strong>{src.sharedOwnershipPct}%</strong>
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => deleteSourceMutation.mutate(src.id)}
                      className="text-gray-400 hover:text-red-600 p-1.5 rounded transition-colors"
                      title="Deactivate Source"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end pt-3 border-t border-gray-200">
              <button
                onClick={() => setManagingClient(null)}
                className="px-4 py-2 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add New Source */}
      {showAddSourceModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-gray-200 max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-200 pb-3">
              <h3 className="text-base font-bold text-gray-800">Add Income Source</h3>
              <button onClick={() => setShowAddSourceModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Source Type</label>
                <select
                  className="w-full p-2 border border-gray-300 rounded-lg"
                  value={sourceForm.sourceType}
                  onChange={(e) =>
                    setSourceForm({
                      ...sourceForm,
                      sourceType: e.target.value as any,
                      tradingName: e.target.value === "uk-property" ? "UK Property Portfolio" : "Self Employment",
                    })
                  }
                >
                  <option value="self-employment">Sole Trader (Self Employment)</option>
                  <option value="uk-property">UK Property Business</option>
                  <option value="foreign-property">Foreign Property</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Trading Name / Identifier</label>
                <input
                  type="text"
                  placeholder="e.g. ACME Consulting or Rental 1"
                  className="w-full p-2 border border-gray-300 rounded-lg"
                  value={sourceForm.tradingName}
                  onChange={(e) => setSourceForm({ ...sourceForm, tradingName: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Accounting Basis</label>
                  <select
                    className="w-full p-2 border border-gray-300 rounded-lg"
                    value={sourceForm.accountingType}
                    onChange={(e) => setSourceForm({ ...sourceForm, accountingType: e.target.value })}
                  >
                    <option value="Cash basis">Cash basis</option>
                    <option value="Accruals basis">Accruals basis</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Ownership Share (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full p-2 border border-gray-300 rounded-lg"
                    value={sourceForm.sharedOwnershipPct}
                    onChange={(e) => setSourceForm({ ...sourceForm, sharedOwnershipPct: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Workflow Connection</label>
                <select
                  className="w-full p-2 border border-gray-300 rounded-lg"
                  value={sourceForm.workflowType}
                  onChange={(e) => setSourceForm({ ...sourceForm, workflowType: e.target.value as any })}
                >
                  <option value="workflow_1_bridging">Workflow 1: Spreadsheet Bridging</option>
                  <option value="workflow_2_365">Workflow 2: Capium 365 Direct</option>
                  <option value="workflow_3_365_bookkeeping">Workflow 3: Capium 365 + Bookkeeping</option>
                  <option value="workflow_4_bookkeeping">Workflow 4: Bookkeeping Only</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-gray-200">
              <button
                onClick={() => setShowAddSourceModal(false)}
                className="px-4 py-2 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={() => addSourceMutation.mutate()}
                disabled={!sourceForm.tradingName || addSourceMutation.isPending}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#6c5ce7] hover:bg-[#5b4bc4] rounded-lg shadow-sm disabled:opacity-50"
              >
                {addSourceMutation.isPending ? "Adding..." : "Save Source"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
