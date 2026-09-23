import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import ClientPayrollLayout, { useClientPayroll } from "./ClientPayrollLayout";
import { apiRequest } from "../../../lib/queryClient";
import {
  Clock, Plus, Upload, Trash2, Search, X,
  FileSpreadsheet, CheckCircle2, AlertCircle
} from "lucide-react";

export default function TimekeepingPage() {
  return (
    <ClientPayrollLayout activeSection="Timekeeping">
      <TimekeepingContent />
    </ClientPayrollLayout>
  );
}

function TimekeepingContent() {
  const { clientId } = useClientPayroll();
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [search, setSearch] = useState("");
  const [csvContent, setCsvContent] = useState("");

  const [form, setForm] = useState({
    employeeId: "",
    periodStart: new Date().toISOString().slice(0, 10),
    periodEnd: new Date().toISOString().slice(0, 10),
    standardHours: "37.5",
    standardRate: "15.00",
    overtimeHours: "0.0",
    overtimeRate: "22.50",
    totalPay: "562.50",
    status: "Approved",
  });

  const { data: records = [], isLoading } = useQuery<any[]>({
    queryKey: [`/api/payroll/timekeeping/${clientId}`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/payroll/timekeeping/${clientId}`);
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: employees = [] } = useQuery<any[]>({
    queryKey: [`/api/payroll/employees`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/payroll/employees`);
      if (!res.ok) return [];
      return res.json();
    },
  });

  const calculateTotal = (stdH: string, stdR: string, otH: string, otR: string) => {
    const sH = parseFloat(stdH) || 0;
    const sR = parseFloat(stdR) || 0;
    const oH = parseFloat(otH) || 0;
    const oR = parseFloat(otR) || 0;
    const total = (sH * sR) + (oH * oR);
    return total.toFixed(2);
  };

  const handleHourChange = (field: string, val: string) => {
    const updated = { ...form, [field]: val };
    updated.totalPay = calculateTotal(
      updated.standardHours,
      updated.standardRate,
      updated.overtimeHours,
      updated.overtimeRate
    );
    setForm(updated);
  };

  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiRequest("POST", `/api/payroll/timekeeping/${clientId}`, payload);
      if (!res.ok) throw new Error("Failed to save timesheet entry");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [`/api/payroll/timekeeping/${clientId}`] });
      setShowModal(false);
    },
  });

  const importMutation = useMutation({
    mutationFn: async (csv: string) => {
      const res = await apiRequest("POST", `/api/payroll/timekeeping/${clientId}/import`, { csv });
      if (!res.ok) throw new Error("Failed to import timesheet CSV");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [`/api/payroll/timekeeping/${clientId}`] });
      setShowCsvModal(false);
      setCsvContent("");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/payroll/timekeeping/${id}`);
      if (!res.ok) throw new Error("Failed to delete timesheet");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [`/api/payroll/timekeeping/${clientId}`] });
    },
  });

  const filtered = records.filter((r) => {
    const emp = employees.find((e) => e.id === r.employeeId);
    const name = emp ? (emp.name || `${emp.firstName} ${emp.lastName}`) : "";
    return name.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Timekeeping & Timesheets</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Log standard hours, overtime, and hourly rates. Automatically imported into monthly pay runs for variable-hour staff.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCsvModal(true)}
            className="px-3 py-2 border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
          >
            <Upload size={13} /> Import Timesheets (CSV)
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="btn-SanSuite flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
          >
            <Plus size={14} /> Log Hours
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-xs overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
          <div className="relative max-w-sm w-full">
            <Search size={13} className="absolute left-3 top-2.5 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by employee name..."
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-purple-400 bg-white"
            />
          </div>
          <span className="text-xs text-gray-500 font-medium">
            {filtered.length} timesheet record{filtered.length === 1 ? "" : "s"}
          </span>
        </div>

        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 text-gray-500 font-medium text-xs border-b border-gray-100">
            <tr>
              <th className="px-4 py-3">Employee</th>
              <th className="px-4 py-3">Period</th>
              <th className="px-4 py-3">Standard Hours</th>
              <th className="px-4 py-3">Hourly Rate</th>
              <th className="px-4 py-3">Overtime Hours</th>
              <th className="px-4 py-3">Overtime Rate</th>
              <th className="px-4 py-3">Total Pay</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
              <tr><td colSpan={9} className="py-8 text-center text-gray-400 text-xs">Loading timesheets...</td></tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-12 text-center">
                  <Clock size={32} className="mx-auto text-gray-300 mb-2" />
                  <p className="text-xs font-semibold text-gray-700">No Timesheets Recorded</p>
                  <p className="text-[11px] text-gray-400 mt-1 mb-3">
                    Log employee hours or bulk import CSV timesheets to calculate variable gross pay.
                  </p>
                  <button
                    onClick={() => setShowModal(true)}
                    className="btn-SanSuite inline-flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
                  >
                    <Plus size={13} /> Log First Timesheet
                  </button>
                </td>
              </tr>
            ) : (
              filtered.map((r) => {
                const emp = employees.find((e) => e.id === r.employeeId);
                return (
                  <tr key={r.id} className="hover:bg-gray-50 text-xs">
                    <td className="px-4 py-3 font-semibold text-gray-900">
                      {emp ? (emp.name || `${emp.firstName} ${emp.lastName}`) : `Employee #${r.employeeId}`}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {r.periodStart} to {r.periodEnd}
                    </td>
                    <td className="px-4 py-3 font-mono">{r.standardHours} hrs</td>
                    <td className="px-4 py-3 font-mono">£{Number(r.standardRate).toFixed(2)}</td>
                    <td className="px-4 py-3 font-mono text-purple-700">{r.overtimeHours || 0} hrs</td>
                    <td className="px-4 py-3 font-mono">£{Number(r.overtimeRate || 0).toFixed(2)}</td>
                    <td className="px-4 py-3 font-mono font-bold text-gray-900">£{Number(r.totalPay).toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {r.status || "Approved"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => deleteMutation.mutate(r.id)}
                        className="text-gray-400 hover:text-red-600 p-1 rounded hover:bg-red-50 cursor-pointer"
                        title="Delete Timesheet"
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Manual Entry Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-5 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-sm text-gray-900">Log Timesheet Hours</h3>
              <button onClick={() => setShowModal(false)}><X size={16} /></button>
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">Employee *</label>
                <select
                  value={form.employeeId}
                  onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
                  className="w-full border rounded-lg p-2"
                >
                  <option value="">Select Employee...</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>{e.name || `${e.firstName} ${e.lastName}`}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Period Start</label>
                  <input
                    type="date"
                    value={form.periodStart}
                    onChange={(e) => setForm({ ...form, periodStart: e.target.value })}
                    className="w-full border rounded-lg p-2"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Period End</label>
                  <input
                    type="date"
                    value={form.periodEnd}
                    onChange={(e) => setForm({ ...form, periodEnd: e.target.value })}
                    className="w-full border rounded-lg p-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Standard Hours</label>
                  <input
                    type="number"
                    step="0.5"
                    value={form.standardHours}
                    onChange={(e) => handleHourChange("standardHours", e.target.value)}
                    className="w-full border rounded-lg p-2 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Hourly Rate (£)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.standardRate}
                    onChange={(e) => handleHourChange("standardRate", e.target.value)}
                    className="w-full border rounded-lg p-2 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Overtime Hours</label>
                  <input
                    type="number"
                    step="0.5"
                    value={form.overtimeHours}
                    onChange={(e) => handleHourChange("overtimeHours", e.target.value)}
                    className="w-full border rounded-lg p-2 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Overtime Rate (£)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.overtimeRate}
                    onChange={(e) => handleHourChange("overtimeRate", e.target.value)}
                    className="w-full border rounded-lg p-2 font-mono"
                  />
                </div>
              </div>

              <div className="bg-purple-50 p-3 rounded-lg border border-purple-100 flex items-center justify-between">
                <span className="font-bold text-purple-900">Total Calculated Gross:</span>
                <span className="font-mono text-base font-bold text-purple-900">£{form.totalPay}</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t pt-3">
              <button onClick={() => setShowModal(false)} className="px-3 py-1.5 text-xs text-gray-600">Cancel</button>
              <button
                onClick={() => saveMutation.mutate(form)}
                disabled={!form.employeeId || saveMutation.isPending}
                className="btn-SanSuite text-xs"
              >
                Save Timesheet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSV Bulk Import Modal */}
      {showCsvModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-5 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-sm text-gray-900">Import Timesheets CSV</h3>
              <button onClick={() => setShowCsvModal(false)}><X size={16} /></button>
            </div>
            <div className="space-y-2 text-xs">
              <p className="text-gray-500">
                Paste CSV data in the standard Capium format: <br />
                <code className="bg-gray-100 px-1 py-0.5 rounded font-mono text-[11px] block mt-1">
                  employeeId,standardHours,standardRate,overtimeHours,overtimeRate
                </code>
              </p>
              <textarea
                value={csvContent}
                onChange={(e) => setCsvContent(e.target.value)}
                placeholder={`1,37.5,15.00,5.0,22.50\n2,40.0,18.00,0,0`}
                rows={6}
                className="w-full border rounded-lg p-2 font-mono text-xs"
              />
            </div>
            <div className="flex justify-end gap-2 border-t pt-3">
              <button onClick={() => setShowCsvModal(false)} className="px-3 py-1.5 text-xs text-gray-600">Cancel</button>
              <button
                onClick={() => importMutation.mutate(csvContent)}
                disabled={!csvContent.trim() || importMutation.isPending}
                className="btn-SanSuite text-xs"
              >
                {importMutation.isPending ? "Importing..." : "Process CSV"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
