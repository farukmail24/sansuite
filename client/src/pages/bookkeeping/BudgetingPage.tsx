import { useState, useMemo } from "react";
import { useLocation, useRoute } from "wouter";
import AppLayout from "../../components/layout/AppLayout";
import { ChevronRight, TrendingUp, Plus, X, Save, Trash2, BarChart2, RefreshCw, AlertCircle } from "lucide-react";
import { bookkeepingSidebar, getClientSidebar } from "./sidebar";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "../../lib/queryClient";
import { useToast } from "../../hooks/useToast";
import ClientGuard from "./ClientGuard";

const MONTHS = ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"];

const BUDGET_CATEGORIES = [
  { type: "income", label: "Turnover / Revenue" },
  { type: "income", label: "Other Income" },
  { type: "expense", label: "Cost of Sales" },
  { type: "expense", label: "Wages & Salaries" },
  { type: "expense", label: "Rent & Rates" },
  { type: "expense", label: "Utilities" },
  { type: "expense", label: "Advertising & Marketing" },
  { type: "expense", label: "Insurance" },
  { type: "expense", label: "Professional Fees" },
  { type: "expense", label: "Depreciation" },
  { type: "expense", label: "Other Expenses" },
];

interface BudgetLine {
  id: string;
  category: string;
  type: "income" | "expense";
  monthly: number[];
  isCustom?: boolean;
}

interface BudgetHeader {
  id: string;
  name: string;
  yearLabel: string;
  lines: BudgetLine[];
  createdAt: string;
}

export default function BudgetingPage() {
  const [match, params] = useRoute("/bookkeeping/:id/*");
  const clientId = match ? params?.id : "";
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();

  if (!clientId) return <ClientGuard featureTitle="Budgeting" />;

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedBudgetId, setSelectedBudgetId] = useState<string | null>(null);

  // Local budget state (stored in client state for UI; API would persist)
  const [budgets, setBudgets] = useState<BudgetHeader[]>([]);

  // P&L actuals for comparison
  const { data: plData = [] } = useQuery({
    queryKey: ["/api/bookkeeping/reports", clientId, "profit-loss"],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/bookkeeping/reports/${clientId}/profit-loss`);
      if (!res.ok) return [];
      const data = await res.json();
      return data.plData || [];
    },
    enabled: !!clientId,
  });

  const [newBudgetForm, setNewBudgetForm] = useState({
    name: "",
    yearLabel: "2025/2026",
    mode: "spread", // spread evenly or enter monthly
  });

  const [editLines, setEditLines] = useState<BudgetLine[]>([]);
  const [addLineForm, setAddLineForm] = useState({ category: "", type: "income" as "income" | "expense" });

  const selectedBudget = budgets.find(b => b.id === selectedBudgetId);

  const startCreate = () => {
    // Seed default lines
    const defaultLines: BudgetLine[] = BUDGET_CATEGORIES.map((cat, i) => ({
      id: `line-${i}`,
      category: cat.label,
      type: cat.type as "income" | "expense",
      monthly: new Array(12).fill(0),
    }));
    setEditLines(defaultLines);
    setNewBudgetForm({ name: "", yearLabel: "2025/2026", mode: "spread" });
    setShowCreateModal(true);
  };

  const saveBudget = () => {
    if (!newBudgetForm.name) {
      toast({ title: "Validation Error", description: "Please enter a budget name.", type: "error" });
      return;
    }
    const newBudget: BudgetHeader = {
      id: Date.now().toString(),
      name: newBudgetForm.name,
      yearLabel: newBudgetForm.yearLabel,
      lines: editLines.filter(l => l.monthly.some(v => v > 0)),
      createdAt: new Date().toISOString(),
    };
    setBudgets(prev => [...prev, newBudget]);
    setSelectedBudgetId(newBudget.id);
    setShowCreateModal(false);
    toast({ title: "Budget Created", description: `"${newBudgetForm.name}" has been set up.` });
  };

  const deleteBudget = (id: string) => {
    setBudgets(prev => prev.filter(b => b.id !== id));
    if (selectedBudgetId === id) setSelectedBudgetId(null);
    toast({ title: "Budget Deleted" });
  };

  const updateMonthly = (lineId: string, monthIdx: number, val: string) => {
    setEditLines(prev => prev.map(l =>
      l.id === lineId ? { ...l, monthly: l.monthly.map((v, i) => i === monthIdx ? parseFloat(val) || 0 : v) } : l
    ));
  };

  const setAnnualSpread = (lineId: string, annual: string) => {
    const total = parseFloat(annual) || 0;
    const monthly = parseFloat((total / 12).toFixed(2));
    setEditLines(prev => prev.map(l =>
      l.id === lineId ? { ...l, monthly: new Array(12).fill(monthly) } : l
    ));
  };

  const addCustomLine = () => {
    if (!addLineForm.category) return;
    setEditLines(prev => [...prev, {
      id: `custom-${Date.now()}`,
      category: addLineForm.category,
      type: addLineForm.type,
      monthly: new Array(12).fill(0),
      isCustom: true,
    }]);
    setAddLineForm({ category: "", type: "income" });
  };

  const totalActualIncome = plData.filter((r: any) => r.type === "income").reduce((s: number, r: any) => s + r.amount, 0);
  const totalActualExpense = plData.filter((r: any) => r.type === "expense").reduce((s: number, r: any) => s + r.amount, 0);

  const budgetTotal = (lines: BudgetLine[], type: "income" | "expense") =>
    lines.filter(l => l.type === type).reduce((s, l) => s + l.monthly.reduce((a, v) => a + v, 0), 0);

  const fmt = (n: number) => `£${n.toLocaleString("en-GB", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  return (
    <AppLayout sidebar={clientId ? getClientSidebar(clientId) : bookkeepingSidebar} module="Bookkeeping">
      <div className="bg-gray-50 min-h-screen">
        {/* Breadcrumb */}
        <div className="bg-white px-4 py-2 border-b border-gray-200 flex items-center justify-between text-sm text-gray-500">
          <div className="flex items-center gap-2">
            <button onClick={() => navigate("/bookkeeping")} className="hover:text-purple-600">Bookkeeping</button>
            <ChevronRight size={14} />
            <span className="font-medium text-gray-800">Budgeting</span>
          </div>
          <button
            onClick={startCreate}
            className="flex items-center gap-2 px-4 py-1.5 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700"
          >
            <Plus size={14} /> Create Budget
          </button>
        </div>

        <div className="p-6 max-w-7xl mx-auto space-y-6">
          {budgets.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-12 text-center">
              <TrendingUp size={48} className="mx-auto text-purple-200 mb-4" />
              <h2 className="text-xl font-semibold text-gray-700 mb-2">No Budgets Set Up</h2>
              <p className="text-gray-500 max-w-md mx-auto mb-6 text-sm">
                Create a financial budget to compare your actual income and expenses against planned targets for the year.
              </p>
              <button
                onClick={startCreate}
                className="px-5 py-2.5 bg-purple-600 text-white rounded-lg text-sm font-semibold hover:bg-purple-700 flex items-center gap-2 mx-auto"
              >
                <Plus size={14} /> Create First Budget
              </button>
            </div>
          ) : (
            <>
              {/* Budget List */}
              <div className="flex gap-3 flex-wrap">
                {budgets.map(b => (
                  <div
                    key={b.id}
                    onClick={() => setSelectedBudgetId(b.id)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-all ${selectedBudgetId === b.id ? "border-purple-500 bg-purple-50 shadow-sm" : "border-gray-200 bg-white hover:border-purple-300"}`}
                  >
                    <BarChart2 size={16} className={selectedBudgetId === b.id ? "text-purple-600" : "text-gray-400"} />
                    <div>
                      <p className="font-semibold text-sm text-gray-800">{b.name}</p>
                      <p className="text-xs text-gray-500">{b.yearLabel}</p>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteBudget(b.id); }}
                      className="ml-2 p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Budget vs Actual View */}
              {selectedBudget && (
                <div className="space-y-4">
                  {/* Summary Cards */}
                  <div className="grid grid-cols-3 gap-4">
                    {[
                      {
                        label: "Budgeted Income",
                        budget: budgetTotal(selectedBudget.lines, "income"),
                        actual: totalActualIncome,
                        color: "green",
                      },
                      {
                        label: "Budgeted Expenses",
                        budget: budgetTotal(selectedBudget.lines, "expense"),
                        actual: totalActualExpense,
                        color: "red",
                      },
                      {
                        label: "Net Budget Profit",
                        budget: budgetTotal(selectedBudget.lines, "income") - budgetTotal(selectedBudget.lines, "expense"),
                        actual: totalActualIncome - totalActualExpense,
                        color: "purple",
                      },
                    ].map(card => {
                      const variance = card.actual - card.budget;
                      return (
                        <div key={card.label} className="SanSuite-card p-5">
                          <p className="text-xs text-gray-500 mb-3">{card.label}</p>
                          <div className="flex justify-between items-end">
                            <div>
                              <p className="text-xs text-gray-400">Budget</p>
                              <p className="text-lg font-bold text-gray-800">{fmt(card.budget)}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-gray-400">Actual</p>
                              <p className={`text-lg font-bold ${card.color === "green" ? "text-green-600" : card.color === "red" ? "text-red-600" : "text-purple-600"}`}>{fmt(card.actual)}</p>
                            </div>
                          </div>
                          <div className="mt-3 pt-3 border-t">
                            <p className="text-xs text-gray-500">Variance: <span className={`font-bold ${variance >= 0 ? "text-green-600" : "text-red-600"}`}>{variance >= 0 ? "+" : ""}{fmt(variance)}</span></p>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Monthly Breakdown Table */}
                  <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                    <div className="px-5 py-4 border-b bg-gradient-to-r from-purple-50 to-white flex items-center justify-between">
                      <div>
                        <h3 className="font-bold text-gray-800">{selectedBudget.name} — Monthly Budget</h3>
                        <p className="text-xs text-gray-500">{selectedBudget.yearLabel} · {selectedBudget.lines.length} budget lines</p>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-50 text-left">
                            <th className="px-4 py-3 text-xs font-bold text-gray-600 uppercase sticky left-0 bg-gray-50 min-w-48">Account</th>
                            {MONTHS.map(m => <th key={m} className="px-3 py-3 text-xs font-bold text-gray-600 text-right min-w-20">{m}</th>)}
                            <th className="px-4 py-3 text-xs font-bold text-gray-600 text-right min-w-24">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          <tr className="bg-green-50">
                            <td colSpan={14} className="px-4 py-2 text-xs font-bold text-green-700 uppercase tracking-wide">Income</td>
                          </tr>
                          {selectedBudget.lines.filter(l => l.type === "income").map(line => (
                            <tr key={line.id} className="hover:bg-gray-50">
                              <td className="px-4 py-2.5 font-medium text-gray-800 sticky left-0 bg-white">{line.category}</td>
                              {line.monthly.map((v, i) => (
                                <td key={i} className="px-3 py-2.5 text-right text-gray-700">{fmt(v)}</td>
                              ))}
                              <td className="px-4 py-2.5 text-right font-bold text-green-700">{fmt(line.monthly.reduce((a, v) => a + v, 0))}</td>
                            </tr>
                          ))}
                          <tr className="bg-green-100 font-bold">
                            <td className="px-4 py-2.5 text-green-800">Total Income</td>
                            {MONTHS.map((_, mi) => (
                              <td key={mi} className="px-3 py-2.5 text-right text-green-800">
                                {fmt(selectedBudget.lines.filter(l => l.type === "income").reduce((s, l) => s + l.monthly[mi], 0))}
                              </td>
                            ))}
                            <td className="px-4 py-2.5 text-right text-green-900">{fmt(budgetTotal(selectedBudget.lines, "income"))}</td>
                          </tr>

                          <tr className="bg-red-50">
                            <td colSpan={14} className="px-4 py-2 text-xs font-bold text-red-700 uppercase tracking-wide">Expenses</td>
                          </tr>
                          {selectedBudget.lines.filter(l => l.type === "expense").map(line => (
                            <tr key={line.id} className="hover:bg-gray-50">
                              <td className="px-4 py-2.5 font-medium text-gray-800 sticky left-0 bg-white">{line.category}</td>
                              {line.monthly.map((v, i) => (
                                <td key={i} className="px-3 py-2.5 text-right text-gray-700">{fmt(v)}</td>
                              ))}
                              <td className="px-4 py-2.5 text-right font-bold text-red-700">{fmt(line.monthly.reduce((a, v) => a + v, 0))}</td>
                            </tr>
                          ))}
                          <tr className="bg-red-100 font-bold">
                            <td className="px-4 py-2.5 text-red-800">Total Expenses</td>
                            {MONTHS.map((_, mi) => (
                              <td key={mi} className="px-3 py-2.5 text-right text-red-800">
                                {fmt(selectedBudget.lines.filter(l => l.type === "expense").reduce((s, l) => s + l.monthly[mi], 0))}
                              </td>
                            ))}
                            <td className="px-4 py-2.5 text-right text-red-900">{fmt(budgetTotal(selectedBudget.lines, "expense"))}</td>
                          </tr>

                          <tr className="bg-purple-100 font-bold">
                            <td className="px-4 py-2.5 text-purple-900">Net Profit (Budget)</td>
                            {MONTHS.map((_, mi) => {
                              const inc = selectedBudget.lines.filter(l => l.type === "income").reduce((s, l) => s + l.monthly[mi], 0);
                              const exp = selectedBudget.lines.filter(l => l.type === "expense").reduce((s, l) => s + l.monthly[mi], 0);
                              return <td key={mi} className={`px-3 py-2.5 text-right ${inc - exp >= 0 ? "text-purple-800" : "text-red-800"}`}>{fmt(inc - exp)}</td>;
                            })}
                            <td className="px-4 py-2.5 text-right text-purple-900">
                              {fmt(budgetTotal(selectedBudget.lines, "income") - budgetTotal(selectedBudget.lines, "expense"))}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Create Budget Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col">
              <div className="flex items-center justify-between p-5 border-b flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center">
                    <BarChart2 size={18} />
                  </div>
                  <h3 className="font-bold text-gray-900">Create New Budget</h3>
                </div>
                <button onClick={() => setShowCreateModal(false)} className="p-1.5 hover:bg-gray-100 rounded-lg"><X size={16} /></button>
              </div>

              <div className="p-5 border-b flex-shrink-0">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Budget Name *</label>
                    <input
                      type="text"
                      value={newBudgetForm.name}
                      onChange={(e) => setNewBudgetForm(p => ({ ...p, name: e.target.value }))}
                      placeholder="e.g. FY 2025/26 Operating Budget"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Tax Year</label>
                    <select value={newBudgetForm.yearLabel} onChange={(e) => setNewBudgetForm(p => ({ ...p, yearLabel: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                      <option>2025/2026</option>
                      <option>2026/2027</option>
                      <option>2024/2025</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Entry Mode</label>
                    <select value={newBudgetForm.mode} onChange={(e) => setNewBudgetForm(p => ({ ...p, mode: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                      <option value="annual">Enter Annual Total (spread evenly)</option>
                      <option value="monthly">Enter Monthly Amounts</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="overflow-auto flex-1 p-5">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-3 py-2 text-left font-bold text-gray-600 sticky left-0 bg-gray-50 min-w-48">Account</th>
                        <th className="px-3 py-2 text-center font-bold text-gray-600 text-purple-700 min-w-24">Type</th>
                        {newBudgetForm.mode === "annual" ? (
                          <th className="px-3 py-2 text-right font-bold text-gray-600 min-w-28">Annual Total</th>
                        ) : (
                          MONTHS.map(m => <th key={m} className="px-2 py-2 text-right font-bold text-gray-600 min-w-20">{m}</th>)
                        )}
                        <th className="px-3 py-2 w-8"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {editLines.map(line => (
                        <tr key={line.id}>
                          <td className="px-3 py-2 font-medium text-gray-700 sticky left-0 bg-white">{line.category}</td>
                          <td className="px-3 py-2 text-center">
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${line.type === "income" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                              {line.type === "income" ? "Income" : "Expense"}
                            </span>
                          </td>
                          {newBudgetForm.mode === "annual" ? (
                            <td className="px-3 py-2">
                              <input
                                type="number"
                                step="100"
                                placeholder="0"
                                value={line.monthly.reduce((a, v) => a + v, 0) || ""}
                                onChange={(e) => setAnnualSpread(line.id, e.target.value)}
                                className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs text-right focus:ring-1 focus:ring-purple-500"
                              />
                            </td>
                          ) : (
                            MONTHS.map((_, mi) => (
                              <td key={mi} className="px-2 py-2">
                                <input
                                  type="number"
                                  step="50"
                                  placeholder="0"
                                  value={line.monthly[mi] || ""}
                                  onChange={(e) => updateMonthly(line.id, mi, e.target.value)}
                                  className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs text-right focus:ring-1 focus:ring-purple-500"
                                />
                              </td>
                            ))
                          )}
                          <td className="px-2 py-2">
                            {line.isCustom && (
                              <button onClick={() => setEditLines(prev => prev.filter(l => l.id !== line.id))} className="p-1 text-red-400 hover:text-red-600">
                                <Trash2 size={12} />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Add Custom Line */}
                <div className="flex items-center gap-3 mt-3 pt-3 border-t">
                  <input
                    type="text"
                    placeholder="Add custom budget line..."
                    value={addLineForm.category}
                    onChange={(e) => setAddLineForm(p => ({ ...p, category: e.target.value }))}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-xs"
                  />
                  <select value={addLineForm.type} onChange={(e) => setAddLineForm(p => ({ ...p, type: e.target.value as any }))} className="px-3 py-2 border border-gray-300 rounded-lg text-xs">
                    <option value="income">Income</option>
                    <option value="expense">Expense</option>
                  </select>
                  <button onClick={addCustomLine} className="px-3 py-2 bg-gray-800 text-white rounded-lg text-xs font-semibold hover:bg-gray-900 flex items-center gap-1">
                    <Plus size={12} /> Add
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 p-5 border-t bg-gray-50 rounded-b-2xl flex-shrink-0">
                <button onClick={() => setShowCreateModal(false)} className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 hover:bg-gray-100">Cancel</button>
                <button onClick={saveBudget} className="px-4 py-2 bg-purple-600 text-white text-sm font-semibold rounded-lg hover:bg-purple-700 flex items-center gap-2">
                  <Save size={14} /> Save Budget
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
