import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearch, useLocation } from "wouter";
import ClientPayrollLayout, { useClientPayroll } from "./ClientPayrollLayout";
import { apiRequest } from "../../../lib/queryClient";
import {
  Calendar, DollarSign, ShieldAlert, Car, Receipt,
  Plus, Search, Edit2, Trash2, X, CheckCircle2,
  AlertCircle, Users, FileText
} from "lucide-react";

export default function AdditionalPayPage() {
  return (
    <ClientPayrollLayout activeSection="Additional">
      <AdditionalPayContent />
    </ClientPayrollLayout>
  );
}

function AdditionalPayContent() {
  const { clientId } = useClientPayroll();
  const searchString = useSearch();
  const [, navigate] = useLocation();
  const qc = useQueryClient();

  // Tab: 'leave' | 'additions' | 'attachments' | 'mileage' | 'expenses'
  const urlTab = new URLSearchParams(searchString).get("tab") || "additions";
  const [activeTab, setActiveTab] = useState(urlTab);

  useEffect(() => {
    if (urlTab) setActiveTab(urlTab);
  }, [urlTab]);

  const setTab = (tab: string) => {
    setActiveTab(tab);
    navigate(`/payroll/${clientId}/additional?tab=${tab}`);
  };

  // Fetch employees for dropdowns
  const { data: employees = [] } = useQuery<any[]>({
    queryKey: [`/api/payroll/employees`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/payroll/employees`);
      if (!res.ok) return [];
      return res.json();
    },
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">Additional Pay & Adjustments</h1>
        <p className="text-xs text-gray-500 mt-0.5">
          Configure statutory leave, recurring & one-off additions, court attachment orders, business mileage, and expense claims.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 gap-1 bg-white px-4 pt-2 rounded-t-xl">
        <button
          onClick={() => setTab("additions")}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
            activeTab === "additions"
              ? "border-purple-600 text-purple-700 bg-purple-50/50"
              : "border-transparent text-gray-500 hover:text-gray-800"
          }`}
        >
          <DollarSign size={14} /> Additions & Deductions
        </button>

        <button
          onClick={() => setTab("leave")}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
            activeTab === "leave"
              ? "border-purple-600 text-purple-700 bg-purple-50/50"
              : "border-transparent text-gray-500 hover:text-gray-800"
          }`}
        >
          <Calendar size={14} /> Statutory Leave (SSP / SMP / SPP)
        </button>

        <button
          onClick={() => setTab("attachments")}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
            activeTab === "attachments"
              ? "border-purple-600 text-purple-700 bg-purple-50/50"
              : "border-transparent text-gray-500 hover:text-gray-800"
          }`}
        >
          <ShieldAlert size={14} /> Attachment of Earnings
        </button>

        <button
          onClick={() => setTab("mileage")}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
            activeTab === "mileage"
              ? "border-purple-600 text-purple-700 bg-purple-50/50"
              : "border-transparent text-gray-500 hover:text-gray-800"
          }`}
        >
          <Car size={14} /> Mileage Claims (45p/25p)
        </button>

        <button
          onClick={() => setTab("expenses")}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
            activeTab === "expenses"
              ? "border-purple-600 text-purple-700 bg-purple-50/50"
              : "border-transparent text-gray-500 hover:text-gray-800"
          }`}
        >
          <Receipt size={14} /> Expense Reimbursements
        </button>
      </div>

      {/* Tab Panels */}
      <div className="bg-white border border-t-0 border-gray-200 rounded-b-xl p-6 shadow-xs">
        {activeTab === "additions" && <AdditionsTab clientId={clientId} employees={employees} />}
        {activeTab === "leave" && <LeaveTab clientId={clientId} employees={employees} />}
        {activeTab === "attachments" && <AttachmentsTab clientId={clientId} employees={employees} />}
        {activeTab === "mileage" && <MileageTab clientId={clientId} employees={employees} />}
        {activeTab === "expenses" && <ExpensesTab clientId={clientId} employees={employees} />}
      </div>
    </div>
  );
}

// =================== TAB 1: ADDITIONS & DEDUCTIONS ===================
function AdditionsTab({ clientId, employees }: { clientId: string; employees: any[] }) {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    employeeId: "",
    type: "addition",
    category: "bonus",
    description: "",
    amount: "0.00",
    isRecurring: false,
    isTaxable: true,
    isNiSubject: true,
    isPensionSubject: true,
  });

  const { data: items = [], isLoading } = useQuery<any[]>({
    queryKey: [`/api/payroll/additions-deductions/${clientId}`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/payroll/additions-deductions/${clientId}`);
      if (!res.ok) return [];
      return res.json();
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiRequest("POST", `/api/payroll/additions-deductions/${clientId}`, payload);
      if (!res.ok) throw new Error("Failed to save item");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [`/api/payroll/additions-deductions/${clientId}`] });
      setShowModal(false);
      setForm({
        employeeId: "",
        type: "addition",
        category: "bonus",
        description: "",
        amount: "0.00",
        isRecurring: false,
        isTaxable: true,
        isNiSubject: true,
        isPensionSubject: true,
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/payroll/additions-deductions/${id}`);
      if (!res.ok) throw new Error("Failed to delete");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [`/api/payroll/additions-deductions/${clientId}`] });
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-sm text-gray-800">Additions & Deductions Schedule</h3>
          <p className="text-xs text-gray-500">Bonuses, commission, overtime allowances, or salary sacrifices</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="btn-SanSuite flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
        >
          <Plus size={14} /> Add Pay Item
        </button>
      </div>

      <table className="w-full text-xs text-left border border-gray-100 rounded-lg overflow-hidden">
        <thead className="bg-gray-50 text-gray-500 font-medium">
          <tr>
            <th className="px-4 py-2.5">Employee</th>
            <th className="px-4 py-2.5">Type</th>
            <th className="px-4 py-2.5">Category</th>
            <th className="px-4 py-2.5">Description</th>
            <th className="px-4 py-2.5">Amount</th>
            <th className="px-4 py-2.5">Tax / NI / Pension</th>
            <th className="px-4 py-2.5">Frequency</th>
            <th className="px-4 py-2.5 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {isLoading ? (
            <tr><td colSpan={8} className="py-6 text-center text-gray-400">Loading items...</td></tr>
          ) : items.length === 0 ? (
            <tr>
              <td colSpan={8} className="py-8 text-center text-gray-400">
                <DollarSign size={24} className="mx-auto text-gray-300 mb-1" />
                No additions or deductions added. Click "+ Add Pay Item" to add bonus, overtime, or deductions.
              </td>
            </tr>
          ) : (
            items.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="px-4 py-2.5 font-semibold text-gray-800">
                  {employees.find((e) => e.id === item.employeeId)?.name || `Employee #${item.employeeId}`}
                </td>
                <td className="px-4 py-2.5 capitalize">
                  <span className={`px-2 py-0.5 rounded font-semibold ${item.type === "addition" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
                    {item.type}
                  </span>
                </td>
                <td className="px-4 py-2.5 capitalize text-gray-600">{item.category}</td>
                <td className="px-4 py-2.5 text-gray-700">{item.description || "—"}</td>
                <td className="px-4 py-2.5 font-mono font-bold text-gray-900">£{Number(item.amount).toFixed(2)}</td>
                <td className="px-4 py-2.5 text-gray-500">
                  {item.isTaxable ? "Taxable" : "Non-taxable"} / {item.isNiSubject ? "NIC" : "No NIC"}
                </td>
                <td className="px-4 py-2.5">{item.isRecurring ? "Recurring" : "One-off"}</td>
                <td className="px-4 py-2.5 text-right">
                  <button
                    onClick={() => deleteMutation.mutate(item.id)}
                    className="text-gray-400 hover:text-red-600 cursor-pointer p-1"
                  >
                    <Trash2 size={13} />
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-5 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-sm text-gray-900">Add Pay Item</h3>
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
                  <label className="block font-semibold mb-1">Type *</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                    className="w-full border rounded-lg p-2"
                  >
                    <option value="addition">Addition (Pay)</option>
                    <option value="deduction">Deduction</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold mb-1">Category *</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full border rounded-lg p-2 capitalize"
                  >
                    <option value="bonus">Bonus</option>
                    <option value="commission">Commission</option>
                    <option value="overtime">Overtime</option>
                    <option value="allowance">Allowance</option>
                    <option value="salary_sacrifice">Salary Sacrifice</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Amount (£) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    className="w-full border rounded-lg p-2 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Frequency</label>
                  <select
                    value={form.isRecurring ? "recurring" : "one-off"}
                    onChange={(e) => setForm({ ...form, isRecurring: e.target.value === "recurring" })}
                    className="w-full border rounded-lg p-2"
                  >
                    <option value="one-off">One-off this pay run</option>
                    <option value="recurring">Recurring every month</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">Description</label>
                <input
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="e.g. Q1 Performance Bonus"
                  className="w-full border rounded-lg p-2"
                />
              </div>

              <div className="flex items-center gap-4 pt-1">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isTaxable}
                    onChange={(e) => setForm({ ...form, isTaxable: e.target.checked })}
                  />
                  <span>Taxable</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isNiSubject}
                    onChange={(e) => setForm({ ...form, isNiSubject: e.target.checked })}
                  />
                  <span>Subject to NI</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isPensionSubject}
                    onChange={(e) => setForm({ ...form, isPensionSubject: e.target.checked })}
                  />
                  <span>Pensionable</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t pt-3">
              <button onClick={() => setShowModal(false)} className="px-3 py-1.5 text-xs text-gray-600">Cancel</button>
              <button
                onClick={() => saveMutation.mutate(form)}
                disabled={!form.employeeId || !form.amount || saveMutation.isPending}
                className="btn-SanSuite text-xs"
              >
                Save Item
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// =================== TAB 2: STATUTORY LEAVE ===================
function LeaveTab({ clientId, employees }: { clientId: string; employees: any[] }) {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    employeeId: "",
    leaveType: "ssp",
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date().toISOString().slice(0, 10),
    qualifyingDaysPerWeek: 5,
    statutoryDailyRate: "23.35",
    totalDaysTaken: 5,
    totalStatutoryPay: "116.75",
  });

  const { data: leaves = [], isLoading } = useQuery<any[]>({
    queryKey: [`/api/payroll/leaves/${clientId}`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/payroll/leaves/${clientId}`);
      if (!res.ok) return [];
      return res.json();
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiRequest("POST", `/api/payroll/leaves/${clientId}`, payload);
      if (!res.ok) throw new Error("Failed to save statutory leave");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [`/api/payroll/leaves/${clientId}`] });
      setShowModal(false);
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-sm text-gray-800">Statutory Leave & Pay Log</h3>
          <p className="text-xs text-gray-500">Statutory Sick Pay (SSP), Maternity (SMP), Paternity (SPP), and Adoption (SAP)</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="btn-SanSuite flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
        >
          <Plus size={14} /> Record Statutory Leave
        </button>
      </div>

      <table className="w-full text-xs text-left border border-gray-100 rounded-lg overflow-hidden">
        <thead className="bg-gray-50 text-gray-500 font-medium">
          <tr>
            <th className="px-4 py-2.5">Employee</th>
            <th className="px-4 py-2.5">Leave Type</th>
            <th className="px-4 py-2.5">Start Date</th>
            <th className="px-4 py-2.5">End Date</th>
            <th className="px-4 py-2.5">Days Taken</th>
            <th className="px-4 py-2.5">Statutory Pay</th>
            <th className="px-4 py-2.5">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {isLoading ? (
            <tr><td colSpan={7} className="py-6 text-center text-gray-400">Loading leave records...</td></tr>
          ) : leaves.length === 0 ? (
            <tr>
              <td colSpan={7} className="py-8 text-center text-gray-400">
                <Calendar size={24} className="mx-auto text-gray-300 mb-1" />
                No statutory leave recorded for this period. Click "+ Record Statutory Leave" to log sick or maternity pay.
              </td>
            </tr>
          ) : (
            leaves.map((l) => (
              <tr key={l.id} className="hover:bg-gray-50">
                <td className="px-4 py-2.5 font-semibold text-gray-800">
                  {employees.find((e) => e.id === l.employeeId)?.name || `Employee #${l.employeeId}`}
                </td>
                <td className="px-4 py-2.5 font-mono uppercase font-bold text-purple-700">{l.leaveType}</td>
                <td className="px-4 py-2.5">{l.startDate}</td>
                <td className="px-4 py-2.5">{l.endDate}</td>
                <td className="px-4 py-2.5">{l.totalDaysTaken} days</td>
                <td className="px-4 py-2.5 font-mono font-bold text-gray-900">£{Number(l.totalStatutoryPay).toFixed(2)}</td>
                <td className="px-4 py-2.5">
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-green-50 text-green-700 border border-green-200">
                    Approved
                  </span>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-5 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-sm text-gray-900">Record Statutory Leave</h3>
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

              <div>
                <label className="block font-semibold mb-1">Leave Type *</label>
                <select
                  value={form.leaveType}
                  onChange={(e) => setForm({ ...form, leaveType: e.target.value })}
                  className="w-full border rounded-lg p-2"
                >
                  <option value="ssp">Statutory Sick Pay (SSP - standard £116.75/wk)</option>
                  <option value="smp">Statutory Maternity Pay (SMP - 90% then statutory)</option>
                  <option value="spp">Statutory Paternity Pay (SPP)</option>
                  <option value="sap">Statutory Adoption Pay (SAP)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Start Date</label>
                  <input
                    type="date"
                    value={form.startDate}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                    className="w-full border rounded-lg p-2"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">End Date</label>
                  <input
                    type="date"
                    value={form.endDate}
                    onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                    className="w-full border rounded-lg p-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Qualifying Days</label>
                  <input
                    type="number"
                    value={form.totalDaysTaken}
                    onChange={(e) => setForm({ ...form, totalDaysTaken: Number(e.target.value) })}
                    className="w-full border rounded-lg p-2"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Statutory Pay (£)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.totalStatutoryPay}
                    onChange={(e) => setForm({ ...form, totalStatutoryPay: e.target.value })}
                    className="w-full border rounded-lg p-2 font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t pt-3">
              <button onClick={() => setShowModal(false)} className="px-3 py-1.5 text-xs text-gray-600">Cancel</button>
              <button
                onClick={() => saveMutation.mutate(form)}
                disabled={!form.employeeId || saveMutation.isPending}
                className="btn-SanSuite text-xs"
              >
                Record Leave
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// =================== TAB 3: ATTACHMENT OF EARNINGS ===================
function AttachmentsTab({ clientId, employees }: { clientId: string; employees: any[] }) {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    employeeId: "",
    orderType: "DEO",
    issuingAuthority: "Child Maintenance Service",
    referenceNumber: "",
    deductionRate: "150.00",
    protectedEarnings: "800.00",
  });

  const { data: attachments = [], isLoading } = useQuery<any[]>({
    queryKey: [`/api/payroll/attachments/${clientId}`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/payroll/attachments/${clientId}`);
      if (!res.ok) return [];
      return res.json();
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiRequest("POST", `/api/payroll/attachments/${clientId}`, payload);
      if (!res.ok) throw new Error("Failed to save attachment");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [`/api/payroll/attachments/${clientId}`] });
      setShowModal(false);
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-sm text-gray-800">Court Attachment of Earnings Orders (AEO)</h3>
          <p className="text-xs text-gray-500">Manage Deductions from Earnings Orders (DEO), Council Tax attachments, and Magistrate Court fines</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="btn-SanSuite flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
        >
          <Plus size={14} /> Add Attachment Order
        </button>
      </div>

      <table className="w-full text-xs text-left border border-gray-100 rounded-lg overflow-hidden">
        <thead className="bg-gray-50 text-gray-500 font-medium">
          <tr>
            <th className="px-4 py-2.5">Employee</th>
            <th className="px-4 py-2.5">Order Type</th>
            <th className="px-4 py-2.5">Issuing Authority</th>
            <th className="px-4 py-2.5">Order Ref</th>
            <th className="px-4 py-2.5">Monthly Deduction</th>
            <th className="px-4 py-2.5">Protected Earnings</th>
            <th className="px-4 py-2.5">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {isLoading ? (
            <tr><td colSpan={7} className="py-6 text-center text-gray-400">Loading orders...</td></tr>
          ) : attachments.length === 0 ? (
            <tr>
              <td colSpan={7} className="py-8 text-center text-gray-400">
                <ShieldAlert size={24} className="mx-auto text-gray-300 mb-1" />
                No active attachment orders. Court orders and child maintenance directives will display here.
              </td>
            </tr>
          ) : (
            attachments.map((a) => (
              <tr key={a.id} className="hover:bg-gray-50">
                <td className="px-4 py-2.5 font-semibold text-gray-800">
                  {employees.find((e) => e.id === a.employeeId)?.name || `Employee #${a.employeeId}`}
                </td>
                <td className="px-4 py-2.5 font-bold text-purple-700">{a.orderType}</td>
                <td className="px-4 py-2.5">{a.issuingAuthority}</td>
                <td className="px-4 py-2.5 font-mono">{a.referenceNumber || "—"}</td>
                <td className="px-4 py-2.5 font-mono font-bold text-gray-900">£{Number(a.deductionRate).toFixed(2)}</td>
                <td className="px-4 py-2.5 font-mono text-gray-600">£{Number(a.protectedEarnings).toFixed(2)}</td>
                <td className="px-4 py-2.5">
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Active
                  </span>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-5 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-sm text-gray-900">Add Attachment of Earnings</h3>
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
                  <label className="block font-semibold mb-1">Order Type *</label>
                  <select
                    value={form.orderType}
                    onChange={(e) => setForm({ ...form, orderType: e.target.value })}
                    className="w-full border rounded-lg p-2"
                  >
                    <option value="DEO">DEO (Child Maintenance)</option>
                    <option value="CTAEO">Council Tax Attachment (CTAEO)</option>
                    <option value="AEO">Civil Court Judgment (AEO)</option>
                    <option value="CPA">Child Support Order</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold mb-1">Authority Name</label>
                  <input
                    value={form.issuingAuthority}
                    onChange={(e) => setForm({ ...form, issuingAuthority: e.target.value })}
                    className="w-full border rounded-lg p-2"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">Case / Order Reference</label>
                <input
                  value={form.referenceNumber}
                  onChange={(e) => setForm({ ...form, referenceNumber: e.target.value })}
                  className="w-full border rounded-lg p-2 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Deduction Amount (£)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.deductionRate}
                    onChange={(e) => setForm({ ...form, deductionRate: e.target.value })}
                    className="w-full border rounded-lg p-2 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Protected Earnings (£)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.protectedEarnings}
                    onChange={(e) => setForm({ ...form, protectedEarnings: e.target.value })}
                    className="w-full border rounded-lg p-2 font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t pt-3">
              <button onClick={() => setShowModal(false)} className="px-3 py-1.5 text-xs text-gray-600">Cancel</button>
              <button
                onClick={() => saveMutation.mutate(form)}
                disabled={!form.employeeId || saveMutation.isPending}
                className="btn-SanSuite text-xs"
              >
                Save Order
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// =================== TAB 4: MILEAGE CLAIMS ===================
function MileageTab({ clientId, employees }: { clientId: string; employees: any[] }) {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    employeeId: "",
    claimDate: new Date().toISOString().slice(0, 10),
    journeyDetails: "",
    miles: "120",
    ratePerMile: "0.45",
    totalAmount: "54.00",
  });

  const { data: claims = [], isLoading } = useQuery<any[]>({
    queryKey: [`/api/payroll/mileage/${clientId}`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/payroll/mileage/${clientId}`);
      if (!res.ok) return [];
      return res.json();
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiRequest("POST", `/api/payroll/mileage/${clientId}`, payload);
      if (!res.ok) throw new Error("Failed to save mileage claim");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [`/api/payroll/mileage/${clientId}`] });
      setShowModal(false);
    },
  });

  const updateMiles = (miles: string, rate: string) => {
    const m = parseFloat(miles) || 0;
    const r = parseFloat(rate) || 0;
    setForm({ ...form, miles, ratePerMile: rate, totalAmount: (m * r).toFixed(2) });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-sm text-gray-800">Business Mileage Reimbursement</h3>
          <p className="text-xs text-gray-500">HMRC Approved Mileage Allowance Payments (AMAP): 45p/mile first 10,000 miles, 25p thereafter</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="btn-SanSuite flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
        >
          <Plus size={14} /> Add Mileage Claim
        </button>
      </div>

      <table className="w-full text-xs text-left border border-gray-100 rounded-lg overflow-hidden">
        <thead className="bg-gray-50 text-gray-500 font-medium">
          <tr>
            <th className="px-4 py-2.5">Employee</th>
            <th className="px-4 py-2.5">Date</th>
            <th className="px-4 py-2.5">Journey Details</th>
            <th className="px-4 py-2.5">Miles</th>
            <th className="px-4 py-2.5">Rate / Mile</th>
            <th className="px-4 py-2.5">Total Claim</th>
            <th className="px-4 py-2.5">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {isLoading ? (
            <tr><td colSpan={7} className="py-6 text-center text-gray-400">Loading mileage claims...</td></tr>
          ) : claims.length === 0 ? (
            <tr>
              <td colSpan={7} className="py-8 text-center text-gray-400">
                <Car size={24} className="mx-auto text-gray-300 mb-1" />
                No mileage claims recorded. Staff business journey allowances will show here.
              </td>
            </tr>
          ) : (
            claims.map((c) => (
              <tr key={c.id} className="hover:bg-gray-50">
                <td className="px-4 py-2.5 font-semibold text-gray-800">
                  {employees.find((e) => e.id === c.employeeId)?.name || `Employee #${c.employeeId}`}
                </td>
                <td className="px-4 py-2.5">{c.claimDate}</td>
                <td className="px-4 py-2.5 text-gray-700">{c.journeyDetails || "—"}</td>
                <td className="px-4 py-2.5 font-mono">{c.miles} mi</td>
                <td className="px-4 py-2.5 font-mono">£{Number(c.ratePerMile).toFixed(2)}</td>
                <td className="px-4 py-2.5 font-mono font-bold text-gray-900">£{Number(c.totalAmount).toFixed(2)}</td>
                <td className="px-4 py-2.5">
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-green-50 text-green-700 border border-green-200">
                    Approved
                  </span>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-5 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-sm text-gray-900">Add Mileage Claim</h3>
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

              <div>
                <label className="block font-semibold mb-1">Claim Date</label>
                <input
                  type="date"
                  value={form.claimDate}
                  onChange={(e) => setForm({ ...form, claimDate: e.target.value })}
                  className="w-full border rounded-lg p-2"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Journey Purpose & Route</label>
                <input
                  value={form.journeyDetails}
                  onChange={(e) => setForm({ ...form, journeyDetails: e.target.value })}
                  placeholder="e.g. Client site audit visit (London to Birmingham)"
                  className="w-full border rounded-lg p-2"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-semibold mb-1">Miles</label>
                  <input
                    type="number"
                    value={form.miles}
                    onChange={(e) => updateMiles(e.target.value, form.ratePerMile)}
                    className="w-full border rounded-lg p-2 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Rate (£)</label>
                  <select
                    value={form.ratePerMile}
                    onChange={(e) => updateMiles(form.miles, e.target.value)}
                    className="w-full border rounded-lg p-2 font-mono"
                  >
                    <option value="0.45">£0.45 (first 10k)</option>
                    <option value="0.25">£0.25 (after 10k)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold mb-1">Total (£)</label>
                  <input
                    readOnly
                    value={form.totalAmount}
                    className="w-full border rounded-lg p-2 font-mono bg-gray-50 font-bold text-gray-900"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t pt-3">
              <button onClick={() => setShowModal(false)} className="px-3 py-1.5 text-xs text-gray-600">Cancel</button>
              <button
                onClick={() => saveMutation.mutate(form)}
                disabled={!form.employeeId || saveMutation.isPending}
                className="btn-SanSuite text-xs"
              >
                Record Mileage
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// =================== TAB 5: EXPENSES ===================
function ExpensesTab({ clientId, employees }: { clientId: string; employees: any[] }) {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    employeeId: "",
    expenseDate: new Date().toISOString().slice(0, 10),
    category: "travel",
    description: "",
    grossAmount: "45.00",
    vatAmount: "7.50",
  });

  const { data: expenses = [], isLoading } = useQuery<any[]>({
    queryKey: [`/api/payroll/expenses/${clientId}`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/payroll/expenses/${clientId}`);
      if (!res.ok) return [];
      return res.json();
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiRequest("POST", `/api/payroll/expenses/${clientId}`, payload);
      if (!res.ok) throw new Error("Failed to save expense claim");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [`/api/payroll/expenses/${clientId}`] });
      setShowModal(false);
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-sm text-gray-800">Reimbursed Staff Expenses</h3>
          <p className="text-xs text-gray-500">Business travel, subsistence, accommodation, and tooling reimbursements</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="btn-SanSuite flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
        >
          <Plus size={14} /> Add Expense Claim
        </button>
      </div>

      <table className="w-full text-xs text-left border border-gray-100 rounded-lg overflow-hidden">
        <thead className="bg-gray-50 text-gray-500 font-medium">
          <tr>
            <th className="px-4 py-2.5">Employee</th>
            <th className="px-4 py-2.5">Date</th>
            <th className="px-4 py-2.5">Category</th>
            <th className="px-4 py-2.5">Description</th>
            <th className="px-4 py-2.5">Gross Amount</th>
            <th className="px-4 py-2.5">VAT Reclaimable</th>
            <th className="px-4 py-2.5">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {isLoading ? (
            <tr><td colSpan={7} className="py-6 text-center text-gray-400">Loading expense claims...</td></tr>
          ) : expenses.length === 0 ? (
            <tr>
              <td colSpan={7} className="py-8 text-center text-gray-400">
                <Receipt size={24} className="mx-auto text-gray-300 mb-1" />
                No expense claims recorded. Staff business expense receipts will show here.
              </td>
            </tr>
          ) : (
            expenses.map((ex) => (
              <tr key={ex.id} className="hover:bg-gray-50">
                <td className="px-4 py-2.5 font-semibold text-gray-800">
                  {employees.find((e) => e.id === ex.employeeId)?.name || `Employee #${ex.employeeId}`}
                </td>
                <td className="px-4 py-2.5">{ex.expenseDate}</td>
                <td className="px-4 py-2.5 capitalize text-gray-600">{ex.category}</td>
                <td className="px-4 py-2.5 text-gray-700">{ex.description || "—"}</td>
                <td className="px-4 py-2.5 font-mono font-bold text-gray-900">£{Number(ex.grossAmount).toFixed(2)}</td>
                <td className="px-4 py-2.5 font-mono text-gray-600">£{Number(ex.vatAmount).toFixed(2)}</td>
                <td className="px-4 py-2.5">
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-green-50 text-green-700 border border-green-200">
                    Approved
                  </span>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-5 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-sm text-gray-900">Add Expense Reimbursement</h3>
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
                  <label className="block font-semibold mb-1">Date</label>
                  <input
                    type="date"
                    value={form.expenseDate}
                    onChange={(e) => setForm({ ...form, expenseDate: e.target.value })}
                    className="w-full border rounded-lg p-2"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Category</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full border rounded-lg p-2 capitalize"
                  >
                    <option value="travel">Travel & Fares</option>
                    <option value="subsistence">Meals & Subsistence</option>
                    <option value="accommodation">Hotel / Lodging</option>
                    <option value="equipment">Tools & Supplies</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">Description / Merchant</label>
                <input
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="e.g. Train ticket to client meeting"
                  className="w-full border rounded-lg p-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Gross (£) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.grossAmount}
                    onChange={(e) => setForm({ ...form, grossAmount: e.target.value })}
                    className="w-full border rounded-lg p-2 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">VAT Reclaim (£)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.vatAmount}
                    onChange={(e) => setForm({ ...form, vatAmount: e.target.value })}
                    className="w-full border rounded-lg p-2 font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t pt-3">
              <button onClick={() => setShowModal(false)} className="px-3 py-1.5 text-xs text-gray-600">Cancel</button>
              <button
                onClick={() => saveMutation.mutate(form)}
                disabled={!form.employeeId || !form.grossAmount || saveMutation.isPending}
                className="btn-SanSuite text-xs"
              >
                Save Expense
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
