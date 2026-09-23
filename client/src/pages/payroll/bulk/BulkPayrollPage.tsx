import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AppLayout from "../../../components/layout/AppLayout";
import { practicePayrollSidebar } from "../sidebar";
import { apiRequest } from "../../../lib/queryClient";
import {
  Layers, Play, Send, Plus, CheckCircle2,
  Clock, Settings, X, Building2, AlertCircle
} from "lucide-react";

export default function BulkPayrollPage() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const [form, setForm] = useState({
    clientId: "",
    frequency: "monthly",
    payDayOfMonth: 28,
    autoProcess: true,
    autoSubmitFps: false,
    autoEmailPayslips: true,
    isActive: true,
  });

  // 1. Fetch practice clients
  const { data: clients = [] } = useQuery<any[]>({
    queryKey: ["/api/practice/clients"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/practice/clients");
      if (!res.ok) return [];
      return res.json();
    },
  });

  // 2. Fetch Bulk Schedules
  const { data: schedules = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/payroll/bulk/schedules"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/payroll/bulk/schedules");
      if (!res.ok) return [];
      return res.json();
    },
  });

  // Save Schedule Mutation
  const saveSchedule = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiRequest("POST", "/api/payroll/bulk/schedules", payload);
      if (!res.ok) throw new Error("Failed to save schedule");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/payroll/bulk/schedules"] });
      setShowModal(false);
    },
  });

  // Run Bulk Pay Runs Mutation
  const runBulkMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/payroll/bulk/run", {
        clientIds: selectedIds.length > 0 ? selectedIds : undefined,
        periodName: `Month ${new Date().getMonth() + 1}`,
      });
      if (!res.ok) throw new Error("Failed to run bulk payroll");
      return res.json();
    },
    onSuccess: (data) => {
      alert(`Bulk Payroll Execution Complete! Processed ${data.processedCount} client pay runs successfully.`);
    },
  });

  // Run Bulk EPS Mutation
  const runEpsMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/payroll/bulk/eps", {
        taxMonth: new Date().getMonth() + 1,
        taxYear: "2024-25",
      });
      if (!res.ok) throw new Error("Failed to file bulk EPS");
      return res.json();
    },
    onSuccess: (data) => {
      alert(`Bulk EPS Transmitted! Filed ${data.submittedCount} Employer Payment Summaries to HMRC.`);
    },
  });

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    if (selectedIds.length === schedules.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(schedules.map((s) => s.clientId));
    }
  };

  return (
    <AppLayout sidebar={practicePayrollSidebar} module="Payroll">
      <div className="p-6 bg-gray-50 min-h-screen">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-xs text-gray-400">Payroll / Firm Automation</p>
              <h1 className="text-xl font-bold text-gray-900 mt-1">Bulk Payroll Automation</h1>
              <p className="text-xs text-gray-500 mt-0.5">
                Batch calculate pay runs, generate payslips, and transmit RTI filings across multiple clients in parallel.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => runEpsMutation.mutate()}
                disabled={runEpsMutation.isPending}
                className="px-3 py-2 border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Send size={13} /> {runEpsMutation.isPending ? "Filing..." : "Bulk File EPS"}
              </button>
              <button
                onClick={() => runBulkMutation.mutate()}
                disabled={runBulkMutation.isPending}
                className="btn-SanSuite flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
              >
                <Play size={13} /> {runBulkMutation.isPending ? "Processing..." : "Run Bulk Payroll"}
              </button>
              <button
                onClick={() => setShowModal(true)}
                className="px-3 py-2 bg-purple-100 hover:bg-purple-200 text-purple-800 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <Plus size={14} /> + Add Schedule
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-xs overflow-hidden">
            <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={selectedIds.length === schedules.length && schedules.length > 0}
                  onChange={selectAll}
                  className="rounded cursor-pointer"
                />
                <span className="text-xs font-semibold text-gray-700">
                  {selectedIds.length} of {schedules.length} clients selected
                </span>
              </div>
            </div>

            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-500 font-medium text-xs border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3 w-10"></th>
                  <th className="px-4 py-3">Client Employer</th>
                  <th className="px-4 py-3">Frequency</th>
                  <th className="px-4 py-3">Pay Day</th>
                  <th className="px-4 py-3">Auto Process</th>
                  <th className="px-4 py-3">Auto RTI FPS</th>
                  <th className="px-4 py-3">Auto Email</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {isLoading ? (
                  <tr><td colSpan={8} className="py-8 text-center text-gray-400 text-xs">Loading bulk schedules...</td></tr>
                ) : schedules.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center">
                      <Layers size={32} className="mx-auto text-gray-300 mb-2" />
                      <p className="text-xs font-semibold text-gray-700">No Bulk Schedules Configured</p>
                      <p className="text-[11px] text-gray-400 mt-1 mb-3">
                        Set up automated pay schedules to run client payrolls simultaneously with zero manual intervention.
                      </p>
                      <button
                        onClick={() => setShowModal(true)}
                        className="btn-SanSuite inline-flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
                      >
                        <Plus size={13} /> Configure First Schedule
                      </button>
                    </td>
                  </tr>
                ) : (
                  schedules.map((s) => {
                    const client = clients.find((c) => c.id === s.clientId);
                    const isSelected = selectedIds.includes(s.clientId);
                    return (
                      <tr key={s.id} className="hover:bg-gray-50 text-xs">
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelect(s.clientId)}
                            className="rounded cursor-pointer"
                          />
                        </td>
                        <td className="px-4 py-3 font-semibold text-gray-900">
                          {client?.clientName || client?.name || `Client #${s.clientId}`}
                        </td>
                        <td className="px-4 py-3 capitalize">{s.frequency}</td>
                        <td className="px-4 py-3 font-mono font-semibold">{s.payDayOfMonth}th of month</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${s.autoProcess ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                            {s.autoProcess ? "Enabled" : "Manual"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${s.autoSubmitFps ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                            {s.autoSubmitFps ? "Live Auto" : "Manual"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${s.autoEmailPayslips ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                            {s.autoEmailPayslips ? "Auto Send" : "Off"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Active
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-5 space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <h3 className="font-bold text-sm text-gray-900">Add Bulk Payroll Schedule</h3>
                <button onClick={() => setShowModal(false)}><X size={16} /></button>
              </div>
              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold mb-1">Client *</label>
                  <select
                    value={form.clientId}
                    onChange={(e) => setForm({ ...form, clientId: e.target.value })}
                    className="w-full border rounded-lg p-2"
                  >
                    <option value="">Select Client...</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>{c.clientName || c.name || `Client #${c.id}`}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold mb-1">Frequency</label>
                    <select
                      value={form.frequency}
                      onChange={(e) => setForm({ ...form, frequency: e.target.value })}
                      className="w-full border rounded-lg p-2"
                    >
                      <option value="monthly">Monthly</option>
                      <option value="weekly">Weekly</option>
                      <option value="fortnightly">Fortnightly</option>
                      <option value="four_weekly">4-Weekly</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">Pay Day (Day of Month)</label>
                    <input
                      type="number"
                      min={1}
                      max={31}
                      value={form.payDayOfMonth}
                      onChange={(e) => setForm({ ...form, payDayOfMonth: Number(e.target.value) })}
                      className="w-full border rounded-lg p-2 font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t">
                  <label className="flex items-center gap-2 cursor-pointer font-medium">
                    <input
                      type="checkbox"
                      checked={form.autoProcess}
                      onChange={(e) => setForm({ ...form, autoProcess: e.target.checked })}
                    />
                    <span>Auto-calculate and process pay run on pay day</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer font-medium">
                    <input
                      type="checkbox"
                      checked={form.autoSubmitFps}
                      onChange={(e) => setForm({ ...form, autoSubmitFps: e.target.checked })}
                    />
                    <span>Auto-transmit Full Payment Submission (FPS) to HMRC</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer font-medium">
                    <input
                      type="checkbox"
                      checked={form.autoEmailPayslips}
                      onChange={(e) => setForm({ ...form, autoEmailPayslips: e.target.checked })}
                    />
                    <span>Auto-dispatch password-protected PDF payslips to staff</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t pt-3">
                <button onClick={() => setShowModal(false)} className="px-3 py-1.5 text-xs text-gray-600">Cancel</button>
                <button
                  onClick={() => saveSchedule.mutate(form)}
                  disabled={!form.clientId || saveSchedule.isPending}
                  className="btn-SanSuite text-xs"
                >
                  Save Schedule
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
