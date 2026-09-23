import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import AppLayout from "../../components/layout/AppLayout";
import { practicePayrollSidebar } from "./sidebar";
import { LayoutDashboard, Users, Calculator, Settings, Plus, Search, X, ChevronDown, CheckCircle, Layers, ArrowRight } from "lucide-react";
import { apiRequest } from "../../lib/queryClient";


export default function PayrollHome() {
  const qc = useQueryClient();
  const [, navigate] = useLocation();
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({
    employerName: "",
    payeReference: "",
    accountsOfficeReference: "",
    clientId: "",
  });

  const { data: schemes = [], isLoading } = useQuery({
    queryKey: ["/api/payroll/schemes"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/payroll/schemes");
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["/api/practice/clients"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/practice/clients");
      if (!res.ok) return [];
      return res.json();
    },
  });

  const createScheme = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/payroll/schemes", data);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/payroll/schemes"] });
      setShowModal(false);
    },
  });

  const deleteScheme = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/payroll/schemes/${id}`);
      if (!res.ok) throw new Error("Failed to delete scheme");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/payroll/schemes"] });
    },
  });

  const { data: rtiLogs = [] } = useQuery({
    queryKey: ["/api/payroll/rti-submissions"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/payroll/rti-submissions");
      if (!res.ok) return [];
      return res.json();
    },
  });

  const handleExportCsv = () => {
    const headers = ["S.No.", "Employer Name", "PAYE Reference", "Accounts Office Ref", "Linked Client"];
    const rows = filtered.map((s: any, idx: number) => [
      idx + 1,
      `"${s.employerName}"`,
      `"${s.payeReference || ''}"`,
      `"${s.accountsOfficeReference || ''}"`,
      `"${clients.find((c: any) => c.id === s.clientId)?.clientName || 'Unlinked'}"`
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r: any) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `payroll_employers_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filtered = schemes.filter((s: any) =>
    s.employerName?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AppLayout sidebar={practicePayrollSidebar} module="Payroll">
      <div className="p-6 bg-gray-50 min-h-screen">
        {/* Top Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-xs text-gray-400">Home / Payroll</p>
            <h1 className="text-xl font-bold text-gray-900 mt-1">Employers & PAYE Schemes Directory</h1>
          </div>
          <div className="flex gap-2">
            <Link
              href="/payroll/bulk"
              className="px-3 py-2 border border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-800 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Layers size={13} /> Bulk Payroll
            </Link>
            <button onClick={handleExportCsv} className="px-3 py-2 border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer">
              Export CSV
            </button>
            <button onClick={() => setShowModal(true)} className="btn-SanSuite flex items-center gap-2 text-xs font-semibold cursor-pointer">
              <Plus size={14} /> + Add PAYE Client
            </button>
          </div>
        </div>

        {/* Submission Summary Widget */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
            <p className="text-xs text-gray-400 font-medium">Total PAYE Schemes</p>
            <p className="text-2xl font-bold text-gray-800 mt-1">{schemes.length}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
            <p className="text-xs text-gray-400 font-medium">Monthly RTI (FPS) Filed</p>
            <p className="text-2xl font-bold text-purple-700 mt-1">{rtiLogs.length}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
            <p className="text-xs text-gray-400 font-medium">Bulk Payroll Automation</p>
            <Link href="/payroll/bulk" className="text-xs font-bold text-purple-700 hover:underline mt-2 inline-flex items-center gap-1">
              Active Schedules <ArrowRight size={12} />
            </Link>
          </div>
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
            <p className="text-xs text-gray-400 font-medium">RTI Gateway Status</p>
            <p className="text-sm font-bold text-green-700 mt-1.5 flex items-center gap-1">
              <CheckCircle size={14} /> HMRC MTD Active
            </p>
          </div>
        </div>

        {/* Search & Table */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-xs overflow-hidden">
          <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
            <div className="relative max-w-sm w-full">
              <Search size={13} className="absolute left-3 top-2.5 text-gray-400" />
              <input 
                value={search} 
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search employer name or PAYE ref..."
                className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-purple-400" 
              />
            </div>
            <span className="text-xs text-gray-500">{filtered.length} employer schemes found</span>
          </div>

          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-500 font-medium text-xs border-b border-gray-100">
              <tr>
                <th className="px-4 py-3 font-medium">S.No.</th>
                <th className="px-4 py-3 font-medium">Employer / Scheme Name</th>
                <th className="px-4 py-3 font-medium">PAYE Reference</th>
                <th className="px-4 py-3 font-medium">Accounts Office Ref</th>
                <th className="px-4 py-3 font-medium">Linked Client</th>
                <th className="px-4 py-3 font-medium">RTI Status</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={7} className="text-center py-8 text-gray-400 text-xs">Loading PAYE schemes...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-8 text-gray-400 text-xs">No employers found. Click "+ Add PAYE Client" to add your first employer.</td></tr>
              ) : (
                filtered.map((s: any, i: number) => {
                  const targetClientId = s.clientId || s.id;
                  return (
                    <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50 text-xs">
                      <td className="px-4 py-3 text-gray-400">{i + 1}</td>
                      <td className="px-4 py-3 font-semibold text-purple-700 hover:underline cursor-pointer" onClick={() => navigate(`/payroll/${targetClientId}/dashboard`)}>
                        {s.employerName}
                      </td>
                      <td className="px-4 py-3 font-mono text-gray-800">{s.payeReference || "—"}</td>
                      <td className="px-4 py-3 font-mono text-gray-600">{s.accountsOfficeReference || "—"}</td>
                      <td className="px-4 py-3 text-gray-700">{clients.find((c: any) => c.id === s.clientId)?.clientName || "Direct Scheme"}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-green-100 text-green-800">
                          RTI Ready
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => navigate(`/payroll/${targetClientId}/dashboard`)} className="text-purple-700 hover:underline text-xs font-semibold">
                            Open Workspace
                          </button>
                          <button onClick={() => navigate(`/payroll/${targetClientId}/settings`)} className="text-gray-500 hover:underline text-xs">
                            Settings
                          </button>
                          <button onClick={() => deleteScheme.mutate(s.id)} disabled={deleteScheme.isPending} className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1 rounded text-xs cursor-pointer">
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="font-bold text-gray-800">Add Employer</h2>
              <button onClick={() => setShowModal(false)}><X size={18} className="text-gray-400" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Link to Client</label>
                <select value={form.clientId} onChange={(e) => setForm((f) => ({ ...f, clientId: e.target.value }))}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2">
                  <option value="1">Standalone / Main Practice Employer</option>
                  {clients.map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.name || c.clientName || c.companyName || `Client #${c.id}`}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Employer Name *</label>
                <input value={form.employerName} onChange={(e) => setForm((f) => ({ ...f, employerName: e.target.value }))}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">PAYE Reference</label>
                <input value={form.payeReference} onChange={(e) => setForm((f) => ({ ...f, payeReference: e.target.value }))}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Accounts Office Reference</label>
                <input value={form.accountsOfficeReference} onChange={(e) => setForm((f) => ({ ...f, accountsOfficeReference: e.target.value }))}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2" />
              </div>
            </div>
            <div className="flex justify-end gap-3 px-5 py-4 border-t bg-gray-50 rounded-b-xl">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-600">Cancel</button>
              <button onClick={() => createScheme.mutate(form)} disabled={!form.employerName || createScheme.isPending} className="btn-SanSuite">
                {createScheme.isPending ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
