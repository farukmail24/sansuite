import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AppLayout from "../../components/layout/AppLayout";
import ClientPayrollLayout from "./workspace/ClientPayrollLayout";
import { practicePayrollSidebar } from "./sidebar";
import {
  Users, Plus, Search, X, CheckCircle2,
  Trash2, Edit2, AlertCircle, Building2
} from "lucide-react";
import { useLocation, useRoute } from "wouter";
import { apiRequest } from "../../lib/queryClient";

export default function EmployeesPage() {
  const [isClientRoute] = useRoute("/payroll/:clientId/employees");

  if (isClientRoute) {
    return (
      <ClientPayrollLayout activeSection="Employees">
        <EmployeesContent />
      </ClientPayrollLayout>
    );
  }

  return (
    <AppLayout sidebar={practicePayrollSidebar} module="Payroll">
      <div className="p-6 bg-gray-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <EmployeesContent />
        </div>
      </div>
    </AppLayout>
  );
}

function EmployeesContent() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    niNumber: "",
    taxCode: "1257L",
    payFrequency: "Monthly",
    salaryType: "AnnualSalary",
    grossRate: "",
  });

  const { data: schemes = [] } = useQuery({
    queryKey: ["/api/payroll/schemes"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/payroll/schemes");
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ["/api/payroll/employees"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/payroll/employees");
      if (!res.ok) return [];
      return res.json();
    },
  });

  const createEmployee = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/payroll/employees", data);
      if (!res.ok) throw new Error("Failed to create employee");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/payroll/employees"] });
      setShowModal(false);
      setForm({
        firstName: "",
        lastName: "",
        niNumber: "",
        taxCode: "1257L",
        payFrequency: "Monthly",
        salaryType: "AnnualSalary",
        grossRate: "",
      });
    },
  });

  const deleteEmployee = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/payroll/employees/${id}`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/payroll/employees"] });
    },
  });

  const filtered = employees.filter((e: any) =>
    `${e.firstName || ""} ${e.lastName || ""} ${e.name || ""}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Employees Directory</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Manage employee tax codes, national insurance numbers, pay frequencies, and employment contracts.
          </p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-SanSuite flex items-center gap-2 text-xs font-semibold cursor-pointer">
          <Plus size={14} /> Add Employee
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-xs overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
          <div className="relative max-w-sm w-full">
            <Search size={13} className="absolute left-3 top-2.5 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search employees by name..."
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-purple-400 bg-white"
            />
          </div>
          <span className="text-xs text-gray-500 font-medium">
            {filtered.length} staff enrolled
          </span>
        </div>

        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 text-gray-500 font-medium text-xs border-b border-gray-100">
            <tr>
              <th className="px-4 py-3">#</th>
              <th className="px-4 py-3">Full Name</th>
              <th className="px-4 py-3">NI Number</th>
              <th className="px-4 py-3">Tax Code</th>
              <th className="px-4 py-3">Pay Frequency</th>
              <th className="px-4 py-3">Salary Type</th>
              <th className="px-4 py-3">Gross Rate</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
              <tr><td colSpan={9} className="text-center py-8 text-gray-400 text-xs">Loading employees...</td></tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-12 text-center">
                  <Users size={32} className="mx-auto text-gray-300 mb-2" />
                  <p className="text-xs font-semibold text-gray-700">No Employees Found</p>
                  <p className="text-[11px] text-gray-400 mt-1 mb-3">Add employees to start processing payroll and calculating PAYE liabilities.</p>
                  <button onClick={() => setShowModal(true)} className="btn-SanSuite inline-flex items-center gap-1.5 text-xs font-semibold cursor-pointer">
                    <Plus size={13} /> Add First Employee
                  </button>
                </td>
              </tr>
            ) : (
              filtered.map((e: any, i: number) => (
                <tr key={e.id} className="hover:bg-gray-50 text-xs">
                  <td className="px-4 py-3 text-gray-400">{i + 1}</td>
                  <td className="px-4 py-3 font-semibold text-gray-900">{e.name || `${e.firstName} ${e.lastName}`}</td>
                  <td className="px-4 py-3 font-mono font-bold text-gray-700">{e.niNumber || e.nationalInsuranceNumber || "—"}</td>
                  <td className="px-4 py-3 font-mono text-purple-700 font-bold">{e.taxCode || "1257L"}</td>
                  <td className="px-4 py-3 text-gray-600">{e.payFrequency || "Monthly"}</td>
                  <td className="px-4 py-3 text-gray-600">{e.salaryType || "Annual Salary"}</td>
                  <td className="px-4 py-3 font-mono font-bold text-gray-900">
                    £{parseFloat(e.grossRate || e.annualSalary || "0").toLocaleString("en-GB", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {e.status || "Active"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => {
                        if (confirm(`Remove employee ${e.name || e.firstName}?`)) {
                          deleteEmployee.mutate(e.id);
                        }
                      }}
                      className="text-gray-400 hover:text-red-600 p-1 rounded hover:bg-red-50 cursor-pointer"
                      title="Remove"
                    >
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="font-bold text-sm text-gray-800">Add Employee</h2>
              <button onClick={() => setShowModal(false)}><X size={16} className="text-gray-400" /></button>
            </div>
            <div className="p-5 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-600 mb-1">First Name *</label>
                  <input value={form.firstName} onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
                    className="w-full text-xs border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-purple-400" />
                </div>
                <div>
                  <label className="block font-semibold text-gray-600 mb-1">Last Name *</label>
                  <input value={form.lastName} onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
                    className="w-full text-xs border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-purple-400" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-600 mb-1">NI Number *</label>
                  <input value={form.niNumber} onChange={(e) => setForm((f) => ({ ...f, niNumber: e.target.value.toUpperCase() }))}
                    placeholder="e.g. QQ123456A"
                    className="w-full text-xs border border-gray-300 rounded-lg px-3 py-2 uppercase font-mono outline-none focus:ring-2 focus:ring-purple-400" />
                </div>
                <div>
                  <label className="block font-semibold text-gray-600 mb-1">Tax Code *</label>
                  <input value={form.taxCode} onChange={(e) => setForm((f) => ({ ...f, taxCode: e.target.value.toUpperCase() }))}
                    className="w-full text-xs border border-gray-300 rounded-lg px-3 py-2 font-mono uppercase outline-none focus:ring-2 focus:ring-purple-400" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-600 mb-1">Pay Frequency</label>
                  <select value={form.payFrequency} onChange={(e) => setForm((f) => ({ ...f, payFrequency: e.target.value }))}
                    className="w-full text-xs border border-gray-300 rounded-lg px-3 py-2">
                    <option value="Monthly">Monthly</option>
                    <option value="Weekly">Weekly</option>
                    <option value="Fortnightly">Fortnightly</option>
                    <option value="FourWeekly">4-Weekly</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-gray-600 mb-1">Salary Type</label>
                  <select value={form.salaryType} onChange={(e) => setForm((f) => ({ ...f, salaryType: e.target.value }))}
                    className="w-full text-xs border border-gray-300 rounded-lg px-3 py-2">
                    <option value="AnnualSalary">Annual Salary</option>
                    <option value="Hourly">Hourly Rate</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-gray-600 mb-1">Gross Annual Salary or Hourly Rate (£) *</label>
                <input type="number" step="0.01" value={form.grossRate} onChange={(e) => setForm((f) => ({ ...f, grossRate: e.target.value }))}
                  placeholder="30000"
                  className="w-full text-xs border border-gray-300 rounded-lg px-3 py-2 font-mono outline-none focus:ring-2 focus:ring-purple-400" />
              </div>
            </div>
            <div className="flex justify-end gap-2 px-5 py-3 border-t bg-gray-50 rounded-b-xl">
              <button onClick={() => setShowModal(false)} className="px-3 py-1.5 text-xs text-gray-600">Cancel</button>
              <button onClick={() => createEmployee.mutate(form)} disabled={!form.firstName || !form.lastName || createEmployee.isPending} className="btn-SanSuite text-xs">
                {createEmployee.isPending ? "Saving..." : "Save Employee"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
