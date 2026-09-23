import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import ClientPayrollLayout, { useClientPayroll } from "./ClientPayrollLayout";
import { apiRequest } from "../../../lib/queryClient";
import {
  Building2, Plus, Search, Edit2, Trash2, X,
  Users, CheckCircle2, AlertCircle
} from "lucide-react";

export default function DepartmentsPage() {
  return (
    <ClientPayrollLayout activeSection="Departments">
      <DepartmentsContent />
    </ClientPayrollLayout>
  );
}

function DepartmentsContent() {
  const { clientId } = useClientPayroll();
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editingDept, setEditingDept] = useState<any>(null);
  const [search, setSearch] = useState("");

  const [form, setForm] = useState({
    code: "",
    name: "",
    description: "",
    managerName: "",
    costCentre: "",
  });

  const { data: departments = [], isLoading } = useQuery<any[]>({
    queryKey: [`/api/payroll/departments/${clientId}`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/payroll/departments/${clientId}`);
      if (!res.ok) return [];
      return res.json();
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiRequest("POST", `/api/payroll/departments/${clientId}`, payload);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to save department");
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [`/api/payroll/departments/${clientId}`] });
      setShowModal(false);
      setEditingDept(null);
      setForm({ code: "", name: "", description: "", managerName: "", costCentre: "" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (deptId: number) => {
      const res = await apiRequest("DELETE", `/api/payroll/departments/${deptId}`);
      if (!res.ok) throw new Error("Failed to delete department");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [`/api/payroll/departments/${clientId}`] });
    },
  });

  const openNew = () => {
    setEditingDept(null);
    setForm({ code: "", name: "", description: "", managerName: "", costCentre: "" });
    setShowModal(true);
  };

  const openEdit = (dept: any) => {
    setEditingDept(dept);
    setForm({
      code: dept.code || "",
      name: dept.name || "",
      description: dept.description || "",
      managerName: dept.managerName || "",
      costCentre: dept.costCentre || "",
    });
    setShowModal(true);
  };

  const filtered = departments.filter((d) =>
    d.name?.toLowerCase().includes(search.toLowerCase()) ||
    d.code?.toLowerCase().includes(search.toLowerCase()) ||
    d.costCentre?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Departments & Cost Centres</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Organise staff into organizational departments, assign cost centres, and generate department-level payroll journals.
          </p>
        </div>
        <button
          onClick={openNew}
          className="btn-SanSuite flex items-center gap-1.5 text-xs font-semibold cursor-pointer shrink-0"
        >
          <Plus size={14} /> Add Department
        </button>
      </div>

      {/* Filter and Table */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-xs overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
          <div className="relative max-w-sm w-full">
            <Search size={13} className="absolute left-3 top-2.5 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search department name, code, or cost centre..."
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-purple-400 bg-white"
            />
          </div>
          <span className="text-xs text-gray-500 font-medium">
            {filtered.length} department{filtered.length === 1 ? "" : "s"}
          </span>
        </div>

        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 text-gray-500 font-medium text-xs border-b border-gray-100">
            <tr>
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">Department Name</th>
              <th className="px-4 py-3">Cost Centre</th>
              <th className="px-4 py-3">Department Manager</th>
              <th className="px-4 py-3">Description</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-gray-400 text-xs">
                  Loading departments...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center">
                  <div className="max-w-xs mx-auto">
                    <Building2 size={32} className="mx-auto text-gray-300 mb-2" />
                    <p className="text-xs font-semibold text-gray-700">No Departments Configured</p>
                    <p className="text-[11px] text-gray-400 mt-1 mb-3">
                      Create departments to segment staff for reporting, cost accounting, and nominal journal grouping.
                    </p>
                    <button
                      onClick={openNew}
                      className="btn-SanSuite inline-flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
                    >
                      <Plus size={13} /> Add First Department
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((d) => (
                <tr key={d.id} className="hover:bg-gray-50 text-xs">
                  <td className="px-4 py-3 font-mono font-bold text-purple-700">
                    {d.code || "—"}
                  </td>
                  <td className="px-4 py-3 font-semibold text-gray-900">
                    {d.name}
                  </td>
                  <td className="px-4 py-3 font-mono text-gray-600">
                    {d.costCentre || "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {d.managerName || "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-500 max-w-xs truncate">
                    {d.description || "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEdit(d)}
                        className="text-gray-500 hover:text-purple-700 p-1 rounded hover:bg-purple-50 transition-colors cursor-pointer"
                        title="Edit Department"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Are you sure you want to delete department "${d.name}"?`)) {
                            deleteMutation.mutate(d.id);
                          }
                        }}
                        disabled={deleteMutation.isPending}
                        className="text-gray-400 hover:text-red-600 p-1 rounded hover:bg-red-50 transition-colors cursor-pointer"
                        title="Delete Department"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="font-bold text-sm text-gray-800">
                {editingDept ? "Edit Department" : "Add New Department"}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-5 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Department Code *</label>
                  <input
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                    placeholder="e.g. ENG, ACCT, OPS"
                    className="w-full text-xs border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-purple-400 font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Cost Centre</label>
                  <input
                    value={form.costCentre}
                    onChange={(e) => setForm({ ...form, costCentre: e.target.value })}
                    placeholder="e.g. CC-1001"
                    className="w-full text-xs border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-purple-400 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Department Name *</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Finance & Accounting"
                  className="w-full text-xs border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-purple-400"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Department Manager</label>
                <input
                  value={form.managerName}
                  onChange={(e) => setForm({ ...form, managerName: e.target.value })}
                  placeholder="Manager full name"
                  className="w-full text-xs border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-purple-400"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Optional notes or operational scope..."
                  rows={2}
                  className="w-full text-xs border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-purple-400"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 px-5 py-3.5 border-t border-gray-100 bg-gray-50">
              <button
                onClick={() => setShowModal(false)}
                className="px-3 py-1.5 text-xs text-gray-600 hover:text-gray-800 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => saveMutation.mutate({ ...form, id: editingDept?.id })}
                disabled={!form.name || !form.code || saveMutation.isPending}
                className="btn-SanSuite text-xs font-semibold cursor-pointer disabled:opacity-50"
              >
                {saveMutation.isPending ? "Saving..." : "Save Department"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
