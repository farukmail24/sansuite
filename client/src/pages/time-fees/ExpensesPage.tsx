import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AppLayout from "../../components/layout/AppLayout";
import { apiRequest } from "../../lib/queryClient";
import { useToast } from "../../hooks/useToast";
import { useAuth } from "../../hooks/useAuth";
import {
  BarChart3, Clock, Briefcase, FileText, Settings, Receipt,
  Plus, Trash2, CheckCircle2, AlertCircle, Search, DollarSign,
  Calendar, Check, X, Shield, Car, Send, ArrowRight,
  PieChart, Building2, User, HelpCircle, FileCheck
} from "lucide-react";

import { timeFeesSidebar } from "./sidebar";

const EXPENSE_CATEGORIES = [
  { id: "Mileage", label: "Mileage (HMRC @ £0.45/mi)", isMileage: true },
  { id: "Travel", label: "Travel & Transport (Train/Taxi/Flight)", isMileage: false },
  { id: "Meals", label: "Meals & Subsistence", isMileage: false },
  { id: "Office Supplies", label: "Office Supplies & Software", isMileage: false },
  { id: "Client Disbursements", label: "Client Disbursements (Filing Fees/Certificates)", isMileage: false },
  { id: "Other", label: "Other Business Expense", isMileage: false },
];

export default function ExpensesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Tab: "all" | "Unsubmitted" | "PFA" | "Approved" | "Reimbursed"
  const [activeTab, setActiveTab] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [selectedExpenseIds, setSelectedExpenseIds] = useState<number[]>([]);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [expenseForm, setExpenseForm] = useState({
    clientId: "",
    jobId: "",
    expenseDate: new Date().toISOString().split("T")[0],
    category: "Mileage",
    amount: "20.25",
    miles: "45",
    mileageRate: "0.45",
    routeStart: "",
    routeEnd: "",
    billable: true,
    notes: "",
  });

  // Rejection Modal
  const [rejectExpenseId, setRejectExpenseId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  // Fetch Expenses
  const { data: expenses = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/time-fees/expenses"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/time-fees/expenses");
      if (!res.ok) return [];
      return res.json();
    },
  });

  // Fetch Clients
  const { data: clients = [] } = useQuery<any[]>({
    queryKey: ["/api/pm/clients"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/pm/clients");
      if (!res.ok) return [];
      return res.json();
    },
  });

  // Fetch Jobs
  const { data: jobsList = [] } = useQuery<any[]>({
    queryKey: ["/api/time-fees/jobs"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/time-fees/jobs");
      if (!res.ok) return [];
      return res.json();
    },
  });

  // Filtered Jobs by selected client
  const clientJobs = useMemo(() => {
    if (!expenseForm.clientId) return [];
    return jobsList.filter((j) => j.clientId === parseInt(expenseForm.clientId));
  }, [expenseForm.clientId, jobsList]);

  // Handle Mileage calculation change
  const handleMilesChange = (milesVal: string, rateVal: string) => {
    const m = parseFloat(milesVal) || 0;
    const r = parseFloat(rateVal) || 0.45;
    const calc = (m * r).toFixed(2);
    setExpenseForm((prev) => ({
      ...prev,
      miles: milesVal,
      mileageRate: rateVal,
      amount: calc,
    }));
  };

  // Create Expense Mutation
  const createExpenseMutation = useMutation({
    mutationFn: async (submitForApproval: boolean) => {
      const amt = parseFloat(expenseForm.amount);
      if (isNaN(amt) || amt <= 0) throw new Error("Please enter a valid expense amount.");

      let fullNotes = expenseForm.notes;
      if (expenseForm.category === "Mileage" && (expenseForm.routeStart || expenseForm.routeEnd)) {
        fullNotes = `Route: ${expenseForm.routeStart || "Office"} to ${expenseForm.routeEnd || "Client"} (${expenseForm.miles} mi @ £${expenseForm.mileageRate}/mi). ${fullNotes}`.trim();
      }

      const payload = {
        clientId: expenseForm.clientId ? parseInt(expenseForm.clientId) : undefined,
        jobId: expenseForm.jobId ? parseInt(expenseForm.jobId) : undefined,
        expenseDate: expenseForm.expenseDate,
        category: expenseForm.category,
        amount: amt.toFixed(2),
        billable: expenseForm.billable,
        status: submitForApproval ? "PFA" : "Unsubmitted",
        notes: fullNotes,
      };

      const res = await apiRequest("POST", "/api/time-fees/expenses", payload);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to log expense");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/time-fees/expenses"] });
      toast({
        title: "Expense Logged",
        description: "The expense claim has been successfully recorded.",
      });
      setShowModal(false);
      setExpenseForm({
        clientId: "",
        jobId: "",
        expenseDate: new Date().toISOString().split("T")[0],
        category: "Mileage",
        amount: "20.25",
        miles: "45",
        mileageRate: "0.45",
        routeStart: "",
        routeEnd: "",
        billable: true,
        notes: "",
      });
    },
    onError: (err: any) => {
      toast({ title: "Error Logging Expense", description: err.message, type: "error" });
    },
  });

  // Submit PFA Mutation
  const submitPfaMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      const res = await apiRequest("POST", "/api/time-fees/expenses/submit-pfa", { expenseIds: ids });
      if (!res.ok) throw new Error("Failed to submit for approval");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/time-fees/expenses"] });
      toast({ title: "Submitted for Approval", description: `${data.updatedCount || "Claims"} submitted for manager review.` });
      setSelectedExpenseIds([]);
    },
  });

  // Approve Mutation
  const approveMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      const res = await apiRequest("POST", "/api/time-fees/expenses/approve", { expenseIds: ids });
      if (!res.ok) throw new Error("Failed to approve expenses");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/time-fees/expenses"] });
      toast({ title: "Expenses Approved", description: `${data.updatedCount || "Claims"} approved for reimbursement and billing.` });
      setSelectedExpenseIds([]);
    },
  });

  // Reject Mutation
  const rejectMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: number; reason: string }) => {
      const res = await apiRequest("POST", "/api/time-fees/expenses/reject", { expenseId: id, reason });
      if (!res.ok) throw new Error("Failed to reject expense");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/time-fees/expenses"] });
      toast({ title: "Expense Rejected", description: "The claim has been returned to the claimant." });
      setRejectExpenseId(null);
      setRejectReason("");
    },
  });

  // Filtered Expenses
  const filteredExpenses = useMemo(() => {
    return expenses.filter((exp) => {
      const matchesTab =
        activeTab === "all" ||
        (activeTab === "Unsubmitted" && (!exp.status || exp.status === "Unsubmitted")) ||
        (activeTab === "PFA" && exp.status === "PFA") ||
        (activeTab === "Approved" && exp.status === "Approved") ||
        (activeTab === "Reimbursed" && (exp.status === "Reimbursed" || exp.isReimbursed));

      const matchesSearch =
        !searchQuery ||
        exp.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        exp.clientName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        exp.notes?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        `${exp.firstName} ${exp.lastName}`.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCat = categoryFilter === "All" || exp.category === categoryFilter;

      return matchesTab && matchesSearch && matchesCat;
    });
  }, [expenses, activeTab, searchQuery, categoryFilter]);

  // Aggregate Metrics
  const totalClaimedSum = useMemo(() => expenses.reduce((acc, curr) => acc + parseFloat(curr.amount || "0"), 0), [expenses]);
  const pfaSum = useMemo(() => expenses.filter((e) => e.status === "PFA").reduce((acc, curr) => acc + parseFloat(curr.amount || "0"), 0), [expenses]);
  const approvedSum = useMemo(() => expenses.filter((e) => e.status === "Approved").reduce((acc, curr) => acc + parseFloat(curr.amount || "0"), 0), [expenses]);
  const reimbursedSum = useMemo(() => expenses.filter((e) => e.status === "Reimbursed" || e.isReimbursed).reduce((acc, curr) => acc + parseFloat(curr.amount || "0"), 0), [expenses]);

  // Handle select all
  const handleToggleSelectAll = () => {
    if (selectedExpenseIds.length === filteredExpenses.length) {
      setSelectedExpenseIds([]);
    } else {
      setSelectedExpenseIds(filteredExpenses.map((e) => e.id));
    }
  };

  const handleToggleSelectOne = (id: number) => {
    if (selectedExpenseIds.includes(id)) {
      setSelectedExpenseIds(selectedExpenseIds.filter((i) => i !== id));
    } else {
      setSelectedExpenseIds([...selectedExpenseIds, id]);
    }
  };

  return (
    <AppLayout sidebar={timeFeesSidebar} module="Time & Fees">
      <div className="bg-slate-50 dark:bg-slate-950 min-h-screen text-xs p-6 space-y-5 w-full">
        
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div>
            <h1 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Receipt className="text-indigo-600" size={18} />
              Staff Expenses & Client Disbursements
            </h1>
            <p className="text-slate-500 text-xs mt-0.5">
              Statutory expense tracking, HMRC mileage allowances (@ £0.45/mi), and 4-stage approval workflow.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowModal(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
            >
              <Plus size={14} /> Log Expense
            </button>
          </div>
        </div>

        {/* 4 Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
            <span className="text-[11px] font-medium text-slate-400">Total Claimed (YTD)</span>
            <p className="text-xl font-bold text-slate-900 dark:text-slate-100">£{totalClaimedSum.toFixed(2)}</p>
            <span className="text-[10px] text-slate-400 font-medium">{expenses.length} Total Claims</span>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
            <span className="text-[11px] font-medium text-slate-400">Pending Approval (PFA)</span>
            <p className="text-xl font-bold text-amber-600">£{pfaSum.toFixed(2)}</p>
            <span className="text-[10px] text-amber-600 font-medium">Awaiting Manager Review</span>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
            <span className="text-[11px] font-medium text-slate-400">Approved for Payment</span>
            <p className="text-xl font-bold text-blue-600">£{approvedSum.toFixed(2)}</p>
            <span className="text-[10px] text-blue-600 font-medium">Ready for Ledger Pay</span>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
            <span className="text-[11px] font-medium text-slate-400">Reimbursed to Staff</span>
            <p className="text-xl font-bold text-emerald-600">£{reimbursedSum.toFixed(2)}</p>
            <span className="text-[10px] text-emerald-600 font-medium">Settled in Payroll / Bank</span>
          </div>
        </div>

        {/* 4-Stage Approval Tabs */}
        <div className="flex items-center gap-1 border-b border-slate-200 dark:border-slate-800 pb-2">
          {[
            { id: "all", label: "All Expenses" },
            { id: "Unsubmitted", label: "Unsubmitted (Drafts)" },
            { id: "PFA", label: "Pending Approval (PFA)" },
            { id: "Approved", label: "Approved" },
            { id: "Reimbursed", label: "Reimbursed" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setSelectedExpenseIds([]);
              }}
              className={`px-4 py-2 font-bold text-xs rounded-lg transition-all cursor-pointer ${
                activeTab === tab.id
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Filter Toolbar & Bulk Actions */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={13} />
              <input
                type="text"
                placeholder="Search staff, client, notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium cursor-pointer"
            >
              <option value="All">All Categories</option>
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          </div>

          {/* Bulk Actions */}
          {selectedExpenseIds.length > 0 && (
            <div className="flex items-center gap-2 bg-indigo-50 dark:bg-indigo-950/40 px-3 py-1.5 rounded-lg border border-indigo-200 dark:border-indigo-800">
              <span className="font-semibold text-indigo-700 dark:text-indigo-300">
                {selectedExpenseIds.length} Selected
              </span>

              {activeTab === "Unsubmitted" && (
                <button
                  onClick={() => submitPfaMutation.mutate(selectedExpenseIds)}
                  disabled={submitPfaMutation.isPending}
                  className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-md cursor-pointer flex items-center gap-1 shadow-2xs"
                >
                  <Send size={11} /> Submit PFA
                </button>
              )}

              {activeTab === "PFA" && (
                <>
                  <button
                    onClick={() => approveMutation.mutate(selectedExpenseIds)}
                    disabled={approveMutation.isPending}
                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-md cursor-pointer flex items-center gap-1 shadow-2xs"
                  >
                    <Check size={11} /> Bulk Approve
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Expenses Table */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          {isLoading ? (
            <div className="p-12 text-center text-slate-400">Loading expenses...</div>
          ) : filteredExpenses.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <div className="w-12 h-12 mx-auto rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 flex items-center justify-center shadow-xs">
                <Receipt size={22} />
              </div>
              <div className="max-w-md mx-auto space-y-1">
                <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                  {activeTab === "all"
                    ? "No Expenses Logged"
                    : `No Expenses in '${activeTab}' Stage`}
                </h4>
                <p className="text-slate-500 text-xs">
                  Record staff mileage (@ £0.45/mile), travel receipts, or client disbursements to manage reimbursement and billing.
                </p>
              </div>
              <button
                onClick={() => setShowModal(true)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs cursor-pointer shadow-xs transition-colors"
              >
                <Plus size={13} className="inline mr-1" /> Log New Expense
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 font-bold text-slate-600 dark:text-slate-300 text-[11px] uppercase tracking-wider">
                    <th className="py-3 px-3 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={selectedExpenseIds.length > 0 && selectedExpenseIds.length === filteredExpenses.length}
                        onChange={handleToggleSelectAll}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 cursor-pointer"
                      />
                    </th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Claimant</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Client / Job</th>
                    <th className="py-3 px-4">Description / Route</th>
                    <th className="py-3 px-4 text-right">Amount (£)</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredExpenses.map((exp) => {
                    const isSelected = selectedExpenseIds.includes(exp.id);
                    const isPending = !exp.status || exp.status === "Unsubmitted";

                    return (
                      <tr key={exp.id} className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors ${isSelected ? 'bg-indigo-50/40 dark:bg-indigo-950/20' : ''}`}>
                        <td className="py-3 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelectOne(exp.id)}
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 cursor-pointer"
                          />
                        </td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                          {exp.expenseDate ? new Date(exp.expenseDate).toLocaleDateString("en-GB") : "Today"}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                          <User size={12} className="text-slate-400" />
                          {exp.firstName || exp.lastName ? `${exp.firstName || ''} ${exp.lastName || ''}`.trim() : "Current Staff"}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            {exp.category}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {exp.clientName ? (
                            <div>
                              <p className="font-semibold text-slate-800 dark:text-slate-200">{exp.clientName}</p>
                              {exp.billable && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 font-bold">
                                  Billable WIP
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">Internal Practice</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-400 max-w-xs truncate" title={exp.notes}>
                          {exp.notes || "-"}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                          £{parseFloat(exp.amount || "0").toFixed(2)}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                              exp.status === "Approved"
                                ? "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300"
                                : exp.status === "Reimbursed" || exp.isReimbursed
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                                : exp.status === "PFA"
                                ? "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300"
                                : exp.status === "Rejected"
                                ? "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300"
                                : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                            }`}
                          >
                            {exp.status || "Unsubmitted"}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {isPending && (
                              <button
                                onClick={() => submitPfaMutation.mutate([exp.id])}
                                disabled={submitPfaMutation.isPending}
                                className="px-2 py-1 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:text-indigo-300 font-bold rounded text-[10px] cursor-pointer"
                                title="Submit for Manager Approval"
                              >
                                Submit PFA
                              </button>
                            )}
                            {exp.status === "PFA" && (
                              <>
                                <button
                                  onClick={() => approveMutation.mutate([exp.id])}
                                  disabled={approveMutation.isPending}
                                  className="px-2 py-1 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-300 font-bold rounded text-[10px] cursor-pointer"
                                  title="Approve Claim"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => setRejectExpenseId(exp.id)}
                                  className="px-2 py-1 bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-950/50 dark:text-rose-300 font-bold rounded text-[10px] cursor-pointer"
                                  title="Reject Claim"
                                >
                                  Reject
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* MODAL: LOG EXPENSE */}
        {showModal && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 max-w-lg w-full shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Receipt className="text-indigo-600" size={16} />
                  <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                    Log Business Expense / Mileage
                  </h3>
                </div>
                <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-3.5 text-xs">
                {/* Category Selector */}
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Expense Category <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={expenseForm.category}
                    onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium cursor-pointer"
                  >
                    {EXPENSE_CATEGORIES.map((c) => (
                      <option key={c.id} value={c.id}>{c.label}</option>
                    ))}
                  </select>
                </div>

                {/* Date & Client */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Expense Date <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={expenseForm.expenseDate}
                      onChange={(e) => setExpenseForm({ ...expenseForm, expenseDate: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Client (Optional)
                    </label>
                    <select
                      value={expenseForm.clientId}
                      onChange={(e) => setExpenseForm({ ...expenseForm, clientId: e.target.value, jobId: "" })}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium cursor-pointer"
                    >
                      <option value="">Internal / No Client</option>
                      {clients.map((c) => (
                        <option key={c.id} value={c.id}>{c.clientName}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* If Client Selected -> Show Job selector and Billable toggle */}
                {expenseForm.clientId && (
                  <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                    <div>
                      <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Linked Job</label>
                      <select
                        value={expenseForm.jobId}
                        onChange={(e) => setExpenseForm({ ...expenseForm, jobId: e.target.value })}
                        className="w-full px-2.5 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 cursor-pointer"
                      >
                        <option value="">Select Job...</option>
                        {clientJobs.map((j) => (
                          <option key={j.id} value={j.id}>{j.jobName}</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center pt-5">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={expenseForm.billable}
                          onChange={(e) => setExpenseForm({ ...expenseForm, billable: e.target.checked })}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                        />
                        <span className="font-semibold text-slate-700 dark:text-slate-300">Billable to Client WIP</span>
                      </label>
                    </div>
                  </div>
                )}

                {/* MILEAGE SPECIALIZED CALCULATOR */}
                {expenseForm.category === "Mileage" ? (
                  <div className="p-3.5 bg-indigo-50/50 dark:bg-indigo-950/30 rounded-xl border border-indigo-100 dark:border-indigo-900/60 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-indigo-900 dark:text-indigo-300 flex items-center gap-1.5">
                        <Car size={14} /> HMRC Mileage Allowance
                      </span>
                      <span className="text-[10px] font-mono text-indigo-700 dark:text-indigo-400 font-semibold">
                        Statutory Rate: £0.45/mile
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Miles Traveled</label>
                        <input
                          type="number"
                          step="1"
                          value={expenseForm.miles}
                          onChange={(e) => handleMilesChange(e.target.value, expenseForm.mileageRate)}
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-mono font-bold"
                        />
                      </div>
                      <div>
                        <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Calculated Claim (£)</label>
                        <input
                          type="text"
                          disabled
                          value={`£${expenseForm.amount}`}
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-emerald-600 font-mono font-bold text-sm"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-slate-600 dark:text-slate-400 block mb-0.5 text-[11px]">Start Location</label>
                        <input
                          type="text"
                          placeholder="e.g. Practice Office"
                          value={expenseForm.routeStart}
                          onChange={(e) => setExpenseForm({ ...expenseForm, routeStart: e.target.value })}
                          className="w-full px-2.5 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                        />
                      </div>
                      <div>
                        <label className="text-slate-600 dark:text-slate-400 block mb-0.5 text-[11px]">Destination</label>
                        <input
                          type="text"
                          placeholder="e.g. Client Site / HMRC"
                          value={expenseForm.routeEnd}
                          onChange={(e) => setExpenseForm({ ...expenseForm, routeEnd: e.target.value })}
                          className="w-full px-2.5 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Standard Expense Amount */
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Expense Amount (£) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={expenseForm.amount}
                      onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-mono font-bold text-sm"
                    />
                  </div>
                )}

                {/* Notes */}
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Notes / Merchant / Receipt Ref</label>
                  <textarea
                    rows={2}
                    placeholder="Provide details of the business expense..."
                    value={expenseForm.notes}
                    onChange={(e) => setExpenseForm({ ...expenseForm, notes: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => createExpenseMutation.mutate(false)}
                  disabled={createExpenseMutation.isPending}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 font-semibold cursor-pointer"
                >
                  Save as Draft
                </button>
                <button
                  type="button"
                  onClick={() => createExpenseMutation.mutate(true)}
                  disabled={createExpenseMutation.isPending}
                  className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-xs cursor-pointer transition-colors"
                >
                  {createExpenseMutation.isPending ? "Saving..." : "Save & Submit PFA"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: REJECT EXPENSE */}
        {rejectExpenseId !== null && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 max-w-md w-full shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <AlertCircle className="text-rose-600" size={16} />
                  <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                    Reject Expense Claim
                  </h3>
                </div>
                <button onClick={() => setRejectExpenseId(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <p className="text-slate-600 dark:text-slate-400">
                  Please provide a reason for rejecting this expense claim so the staff member can make corrections.
                </p>
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Rejection Reason <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={3}
                    placeholder="e.g. Missing VAT receipt / mileage rate adjusted"
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setRejectExpenseId(null)}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!rejectReason.trim()) {
                      toast({ title: "Reason Required", description: "Please explain why the claim is being rejected." });
                      return;
                    }
                    rejectMutation.mutate({ id: rejectExpenseId, reason: rejectReason });
                  }}
                  disabled={rejectMutation.isPending}
                  className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-xs cursor-pointer"
                >
                  {rejectMutation.isPending ? "Rejecting..." : "Confirm Rejection"}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </AppLayout>
  );
}
