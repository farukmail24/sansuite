import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "../../lib/queryClient";
import { useToast } from "../../hooks/useToast";
import {
  X, FileText, CheckSquare, Square, Building2, Clock,
  Receipt, DollarSign, Calendar, ChevronRight, AlertCircle,
  CheckCircle2, Layers, ArrowRight, ShieldCheck, Sparkles,
  HelpCircle, RefreshCw
} from "lucide-react";

interface WipToInvoiceWizardProps {
  isOpen: boolean;
  onClose: () => void;
  preSelectedClientId?: number | null;
  onInvoiceCreated?: (invoiceId: number) => void;
}

export default function WipToInvoiceWizard({
  isOpen,
  onClose,
  preSelectedClientId = null,
  onInvoiceCreated,
}: WipToInvoiceWizardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedClientId, setSelectedClientId] = useState<number | null>(preSelectedClientId);
  const [includeAllStatuses, setIncludeAllStatuses] = useState<boolean>(true);
  const [lineItemMode, setLineItemMode] = useState<"detailed" | "consolidated">("detailed");
  const [defaultVatRate, setDefaultVatRate] = useState<number>(0.20);
  
  const [invoiceDate, setInvoiceDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [dueDate, setDueDate] = useState<string>(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  );
  const [invoiceReference, setInvoiceReference] = useState<string>("");

  const [selectedTimesheetIds, setSelectedTimesheetIds] = useState<number[]>([]);
  const [selectedExpenseIds, setSelectedExpenseIds] = useState<number[]>([]);

  // Update selected client if passed from prop
  useEffect(() => {
    if (preSelectedClientId) {
      setSelectedClientId(preSelectedClientId);
    }
  }, [preSelectedClientId]);

  // Fetch unbilled WIP from API
  const { data: wipData, isLoading: isLoadingWip, refetch: refetchWip } = useQuery<{
    unbilledTimesheets: any[];
    unbilledExpenses: any[];
    clientSummary: any[];
    summary: {
      timesheetsCount: number;
      totalTimeHours: number;
      totalTimeValue: number;
      expensesCount: number;
      totalExpenseValue: number;
      totalWipValue: number;
    };
  }>({
    queryKey: ["/api/time-fees/wip/unbilled", selectedClientId, includeAllStatuses],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedClientId) params.append("clientId", String(selectedClientId));
      if (includeAllStatuses) params.append("includeAll", "true");
      
      const res = await apiRequest("GET", `/api/time-fees/wip/unbilled?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load unbilled WIP");
      return res.json();
    },
    enabled: isOpen,
  });

  // Fetch clients for dropdown
  const { data: clients = [] } = useQuery<any[]>({
    queryKey: ["/api/pm/clients"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/pm/clients");
      if (!res.ok) return [];
      return res.json();
    },
    enabled: isOpen,
  });

  const availableClients = useMemo(() => {
    return wipData?.clientSummary || [];
  }, [wipData]);

  // Auto-select first client if none selected and summary exists
  useEffect(() => {
    if (!selectedClientId && availableClients.length > 0) {
      setSelectedClientId(availableClients[0].clientId);
    }
  }, [availableClients, selectedClientId]);

  // When client changes or WIP data loads, auto-select all its entries by default
  useEffect(() => {
    if (wipData) {
      const clientTimesheets = wipData.unbilledTimesheets
        .filter((t) => !selectedClientId || t.clientId === selectedClientId)
        .map((t) => t.id);
      const clientExpenses = wipData.unbilledExpenses
        .filter((e) => !selectedClientId || e.clientId === selectedClientId)
        .map((e) => e.id);

      setSelectedTimesheetIds(clientTimesheets);
      setSelectedExpenseIds(clientExpenses);

      // Default reference
      const selectedClientName = clients.find((c) => c.id === selectedClientId)?.clientName || 
        availableClients.find((c) => c.clientId === selectedClientId)?.clientName || "";
      if (selectedClientName) {
        const monthName = new Date().toLocaleString("en-GB", { month: "short", year: "numeric" });
        setInvoiceReference(`Fee Note - ${selectedClientName} (${monthName})`);
      }
    }
  }, [wipData, selectedClientId, clients, availableClients]);

  // Filter items for current client
  const currentTimesheets = useMemo(() => {
    if (!wipData?.unbilledTimesheets) return [];
    if (!selectedClientId) return wipData.unbilledTimesheets;
    return wipData.unbilledTimesheets.filter((t) => t.clientId === selectedClientId);
  }, [wipData, selectedClientId]);

  const currentExpenses = useMemo(() => {
    if (!wipData?.unbilledExpenses) return [];
    if (!selectedClientId) return wipData.unbilledExpenses;
    return wipData.unbilledExpenses.filter((e) => e.clientId === selectedClientId);
  }, [wipData, selectedClientId]);

  // Calculated totals of SELECTED items
  const totals = useMemo(() => {
    const selectedTime = currentTimesheets.filter((t) => selectedTimesheetIds.includes(t.id));
    const selectedExp = currentExpenses.filter((e) => selectedExpenseIds.includes(e.id));

    const totalHours = selectedTime.reduce((sum, t) => sum + parseFloat(String(t.hours || "0")), 0);
    const timeNet = selectedTime.reduce(
      (sum, t) => sum + (parseFloat(String(t.hours || "0")) * parseFloat(String(t.ratePerHour || "0"))),
      0
    );
    const expNet = selectedExp.reduce((sum, e) => sum + parseFloat(String(e.amount || "0")), 0);

    const netAmount = timeNet + expNet;
    const vatAmount = netAmount * defaultVatRate;
    const grossAmount = netAmount + vatAmount;

    return {
      selectedTimeCount: selectedTime.length,
      selectedExpCount: selectedExp.length,
      totalHours: parseFloat(totalHours.toFixed(2)),
      timeNet: parseFloat(timeNet.toFixed(2)),
      expNet: parseFloat(expNet.toFixed(2)),
      netAmount: parseFloat(netAmount.toFixed(2)),
      vatAmount: parseFloat(vatAmount.toFixed(2)),
      grossAmount: parseFloat(grossAmount.toFixed(2)),
    };
  }, [currentTimesheets, currentExpenses, selectedTimesheetIds, selectedExpenseIds, defaultVatRate]);

  // Generate Invoice Mutation
  const generateInvoiceMutation = useMutation({
    mutationFn: async () => {
      if (!selectedClientId) throw new Error("Please select a client to bill");
      if (selectedTimesheetIds.length === 0 && selectedExpenseIds.length === 0) {
        throw new Error("Please select at least one timesheet entry or billable expense to bill");
      }

      const payload = {
        clientId: selectedClientId,
        timesheetIds: selectedTimesheetIds,
        expenseIds: selectedExpenseIds,
        invoiceDate,
        dueDate,
        reference: invoiceReference || `WIP Billing (${totals.selectedTimeCount} timesheets, ${totals.selectedExpCount} expenses)`,
        lineItemMode,
        defaultVatRate,
      };

      const res = await apiRequest("POST", "/api/time-fees/invoices/generate-from-wip", payload);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to generate invoice from WIP");
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Invoice Generated Successfully",
        description: `Created ${data.invoiceNumber} for £${Number(data.totalAmount || totals.grossAmount).toFixed(2)}. ${data.billedTimesheets} timesheets and ${data.billedExpenses} expenses marked as Billed.`,
      });

      // Refetch queries
      queryClient.invalidateQueries({ queryKey: ["/api/time-fees/wip/unbilled"] });
      queryClient.invalidateQueries({ queryKey: ["/api/time-fees/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/time-fees/timesheets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/time-fees/expenses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/time-fees/dashboard-stats"] });

      if (onInvoiceCreated && data.invoiceId) {
        onInvoiceCreated(data.invoiceId);
      }
      onClose();
    },
    onError: (err: any) => {
      toast({
        title: "Invoice Generation Failed",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  // Selection handlers
  const toggleAllTimesheets = () => {
    if (selectedTimesheetIds.length === currentTimesheets.length) {
      setSelectedTimesheetIds([]);
    } else {
      setSelectedTimesheetIds(currentTimesheets.map((t) => t.id));
    }
  };

  const toggleAllExpenses = () => {
    if (selectedExpenseIds.length === currentExpenses.length) {
      setSelectedExpenseIds([]);
    } else {
      setSelectedExpenseIds(currentExpenses.map((e) => e.id));
    }
  };

  const toggleTimesheet = (id: number) => {
    setSelectedTimesheetIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleExpense = (id: number) => {
    setSelectedExpenseIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-purple-700 via-indigo-700 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
              <FileText className="w-5 h-5 text-purple-200" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-lg font-bold tracking-tight">Convert WIP to Invoice</h3>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-400/30">
                  Money Pipeline
                </span>
              </div>
              <p className="text-xs text-purple-200/80">
                Transform logged hours and rechargeable client disbursements into a formal statutory invoice.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Top Control Bar: Client Selector & Mode */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Target Client (with Unbilled WIP)
              </label>
              <select
                value={selectedClientId || ""}
                onChange={(e) => setSelectedClientId(Number(e.target.value) || null)}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">-- Choose Client --</option>
                {clients.map((c) => {
                  const summaryItem = availableClients.find((s) => s.clientId === c.id);
                  const wipText = summaryItem ? ` (£${summaryItem.totalWip.toFixed(2)} WIP)` : "";
                  return (
                    <option key={c.id} value={c.id}>
                      {c.clientName} {wipText}
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Line Item Format
              </label>
              <div className="flex rounded-lg border border-slate-300 dark:border-slate-700 p-0.5 bg-white dark:bg-slate-900">
                <button
                  type="button"
                  onClick={() => setLineItemMode("detailed")}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${
                    lineItemMode === "detailed"
                      ? "bg-purple-600 text-white shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                  }`}
                >
                  Itemized Entries
                </button>
                <button
                  type="button"
                  onClick={() => setLineItemMode("consolidated")}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${
                    lineItemMode === "consolidated"
                      ? "bg-purple-600 text-white shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                  }`}
                >
                  Consolidated Summary
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                WIP Status Scope
              </label>
              <div className="flex rounded-lg border border-slate-300 dark:border-slate-700 p-0.5 bg-white dark:bg-slate-900">
                <button
                  type="button"
                  onClick={() => setIncludeAllStatuses(false)}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${
                    !includeAllStatuses
                      ? "bg-purple-600 text-white shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                  }`}
                >
                  Approved Only
                </button>
                <button
                  type="button"
                  onClick={() => setIncludeAllStatuses(true)}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${
                    includeAllStatuses
                      ? "bg-purple-600 text-white shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                  }`}
                >
                  All Unbilled Logs
                </button>
              </div>
            </div>
          </div>

          {/* KPI Summary Banner */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900/50">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                Selected Time
              </span>
              <div className="text-lg font-bold text-purple-900 dark:text-purple-200 mt-0.5">
                {totals.totalHours.toFixed(1)} hrs
              </div>
              <div className="text-xs text-purple-600/80 dark:text-purple-400">
                {totals.selectedTimeCount} entries (£{totals.timeNet.toFixed(2)})
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/50">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                Selected Expenses
              </span>
              <div className="text-lg font-bold text-emerald-900 dark:text-emerald-200 mt-0.5">
                £{totals.expNet.toFixed(2)}
              </div>
              <div className="text-xs text-emerald-600/80 dark:text-emerald-400">
                {totals.selectedExpCount} rechargeable items
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Net Fee Value
              </span>
              <div className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                £{totals.netAmount.toFixed(2)}
              </div>
              <div className="text-xs text-slate-500">
                VAT ({(defaultVatRate * 100).toFixed(0)}%): £{totals.vatAmount.toFixed(2)}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/60 shadow-sm">
              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                Total Invoice Gross
              </span>
              <div className="text-xl font-black text-indigo-900 dark:text-indigo-100 mt-0.5">
                £{totals.grossAmount.toFixed(2)}
              </div>
              <div className="text-xs font-medium text-indigo-600 dark:text-indigo-400">
                Ready to dispatch
              </div>
            </div>
          </div>

          {/* Section 1: Timesheet Entries Table */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900">
            <div className="px-4 py-3 bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  Billable Timesheets ({currentTimesheets.length})
                </h4>
              </div>
              {currentTimesheets.length > 0 && (
                <button
                  type="button"
                  onClick={toggleAllTimesheets}
                  className="text-xs font-semibold text-purple-600 dark:text-purple-400 hover:underline flex items-center space-x-1"
                >
                  <span>
                    {selectedTimesheetIds.length === currentTimesheets.length
                      ? "Deselect All"
                      : "Select All"}
                  </span>
                </button>
              )}
            </div>

            {currentTimesheets.length === 0 ? (
              <div className="p-6 text-center text-slate-500 text-xs">
                No unbilled timesheet entries found for this client.
              </div>
            ) : (
              <div className="overflow-x-auto max-h-56">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/40 text-slate-500 border-b border-slate-200 dark:border-slate-800 sticky top-0">
                    <tr>
                      <th className="p-2.5 w-8"></th>
                      <th className="p-2.5 font-semibold">Date</th>
                      <th className="p-2.5 font-semibold">Staff Member</th>
                      <th className="p-2.5 font-semibold">Task / Service</th>
                      <th className="p-2.5 font-semibold">Description</th>
                      <th className="p-2.5 font-semibold text-right">Hours</th>
                      <th className="p-2.5 font-semibold text-right">Rate/hr</th>
                      <th className="p-2.5 font-semibold text-right">Subtotal</th>
                      <th className="p-2.5 font-semibold text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                    {currentTimesheets.map((entry) => {
                      const isSelected = selectedTimesheetIds.includes(entry.id);
                      const hours = parseFloat(String(entry.hours || "0"));
                      const rate = parseFloat(String(entry.ratePerHour || "0"));
                      const subtotal = hours * rate;

                      return (
                        <tr
                          key={entry.id}
                          onClick={() => toggleTimesheet(entry.id)}
                          className={`cursor-pointer transition-colors ${
                            isSelected
                              ? "bg-purple-50/70 dark:bg-purple-950/20"
                              : "hover:bg-slate-50 dark:hover:bg-slate-800/40"
                          }`}
                        >
                          <td className="p-2.5 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleTimesheet(entry.id)}
                              className="rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                              onClick={(e) => e.stopPropagation()}
                            />
                          </td>
                          <td className="p-2.5 whitespace-nowrap font-medium text-slate-900 dark:text-slate-100">
                            {new Date(entry.date).toLocaleDateString("en-GB")}
                          </td>
                          <td className="p-2.5 whitespace-nowrap">{entry.userName || "Staff"}</td>
                          <td className="p-2.5 font-semibold text-purple-700 dark:text-purple-300">
                            {entry.taskName || "General"}
                          </td>
                          <td className="p-2.5 max-w-xs truncate text-slate-500 dark:text-slate-400">
                            {entry.description || "Statutory compliance work"}
                          </td>
                          <td className="p-2.5 text-right font-medium">{hours.toFixed(2)}h</td>
                          <td className="p-2.5 text-right text-slate-500">£{rate.toFixed(2)}</td>
                          <td className="p-2.5 text-right font-bold text-slate-900 dark:text-white">
                            £{subtotal.toFixed(2)}
                          </td>
                          <td className="p-2.5 text-center">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                entry.status === "Approved"
                                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200"
                                  : "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200"
                              }`}
                            >
                              {entry.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Section 2: Rechargeable Expenses Table */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900">
            <div className="px-4 py-3 bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Receipt className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  Rechargeable Client Expenses & Mileage ({currentExpenses.length})
                </h4>
              </div>
              {currentExpenses.length > 0 && (
                <button
                  type="button"
                  onClick={toggleAllExpenses}
                  className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center space-x-1"
                >
                  <span>
                    {selectedExpenseIds.length === currentExpenses.length
                      ? "Deselect All"
                      : "Select All"}
                  </span>
                </button>
              )}
            </div>

            {currentExpenses.length === 0 ? (
              <div className="p-6 text-center text-slate-500 text-xs">
                No unbilled rechargeable expenses or disbursements found for this client.
              </div>
            ) : (
              <div className="overflow-x-auto max-h-56">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/40 text-slate-500 border-b border-slate-200 dark:border-slate-800 sticky top-0">
                    <tr>
                      <th className="p-2.5 w-8"></th>
                      <th className="p-2.5 font-semibold">Date</th>
                      <th className="p-2.5 font-semibold">Staff Member</th>
                      <th className="p-2.5 font-semibold">Category</th>
                      <th className="p-2.5 font-semibold">Notes / Claim Details</th>
                      <th className="p-2.5 font-semibold text-right">Amount</th>
                      <th className="p-2.5 font-semibold text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                    {currentExpenses.map((exp) => {
                      const isSelected = selectedExpenseIds.includes(exp.id);
                      const amt = parseFloat(String(exp.amount || "0"));

                      return (
                        <tr
                          key={exp.id}
                          onClick={() => toggleExpense(exp.id)}
                          className={`cursor-pointer transition-colors ${
                            isSelected
                              ? "bg-emerald-50/70 dark:bg-emerald-950/20"
                              : "hover:bg-slate-50 dark:hover:bg-slate-800/40"
                          }`}
                        >
                          <td className="p-2.5 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleExpense(exp.id)}
                              className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                              onClick={(e) => e.stopPropagation()}
                            />
                          </td>
                          <td className="p-2.5 whitespace-nowrap font-medium text-slate-900 dark:text-slate-100">
                            {new Date(exp.expenseDate).toLocaleDateString("en-GB")}
                          </td>
                          <td className="p-2.5 whitespace-nowrap">{exp.userName || "Staff"}</td>
                          <td className="p-2.5 font-semibold text-emerald-700 dark:text-emerald-300">
                            {exp.category}
                          </td>
                          <td className="p-2.5 max-w-xs truncate text-slate-500 dark:text-slate-400">
                            {exp.notes || "Client disbursement"}
                          </td>
                          <td className="p-2.5 text-right font-bold text-slate-900 dark:text-white">
                            £{amt.toFixed(2)}
                          </td>
                          <td className="p-2.5 text-center">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                exp.status === "Approved"
                                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200"
                                  : "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200"
                              }`}
                            >
                              {exp.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Section 3: Invoice Settings & Due Date */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Invoice Date
              </label>
              <input
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Payment Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                VAT Rate
              </label>
              <select
                value={defaultVatRate}
                onChange={(e) => setDefaultVatRate(parseFloat(e.target.value))}
                className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value={0.20}>Standard VAT (20%)</option>
                <option value={0.05}>Reduced Rate (5%)</option>
                <option value={0.00}>Zero Rated (0%)</option>
                <option value={0.00}>Exempt / No VAT</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Invoice Reference / Notes
              </label>
              <input
                type="text"
                placeholder="e.g. WIP Settlement - Q3 Accounts"
                value={invoiceReference}
                onChange={(e) => setInvoiceReference(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-100 dark:bg-slate-800/90 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500 flex items-center space-x-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>
              Generating this invoice will mark the selected {totals.selectedTimeCount} timesheets and{" "}
              {totals.selectedExpCount} expenses as <strong>Billed</strong>.
            </span>
          </div>

          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={
                generateInvoiceMutation.isPending ||
                (totals.selectedTimeCount === 0 && totals.selectedExpCount === 0)
              }
              onClick={() => generateInvoiceMutation.mutate()}
              className="px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 rounded-lg shadow-md hover:shadow-lg transition-all flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {generateInvoiceMutation.isPending ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Generating Invoice...</span>
                </>
              ) : (
                <>
                  <FileText className="w-3.5 h-3.5" />
                  <span>Generate Invoice (£{totals.grossAmount.toFixed(2)})</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
