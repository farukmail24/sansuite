import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import AppLayout from "../../components/layout/AppLayout";
import {
  LayoutDashboard, FileText, Settings, Send, Save, Calculator,
  Building2, Trash2, Plus, Shield, CheckCircle2, AlertCircle,
  FileSignature, Printer, RefreshCw, ChevronRight, Download
} from "lucide-react";
import { apiRequest } from "../../lib/queryClient";
import { useToast } from "../../hooks/useToast";

const sidebar = [
  { label: "Dashboard", icon: <LayoutDashboard size={15} />, route: "/corporation-tax" },
  { label: "CT600 Returns", icon: <FileText size={15} />, route: "/corporation-tax/returns" },
  { label: "Settings", icon: <Settings size={15} />, route: "/corporation-tax/settings" },
];

export default function CT600Form() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [match, params] = useRoute("/corporation-tax/:clientId");

  const [clientId, setClientId] = useState<string>(params?.clientId || "");
  const [taxYear, setTaxYear] = useState("2025/2026");
  const [periodStart, setPeriodStart] = useState("2025-04-01");
  const [periodEnd, setPeriodEnd] = useState("2026-03-31");
  const [utrNumber, setUtrNumber] = useState("");

  // Profit & Reconciliation Inputs
  const [turnover, setTurnover] = useState("0.00");
  const [netAccountingProfit, setNetAccountingProfit] = useState("0.00");
  const [disallowableExpenses, setDisallowableExpenses] = useState("0.00");
  const [depreciationAddBack, setDepreciationAddBack] = useState("0.00");
  const [capitalAllowancesClaimed, setCapitalAllowancesClaimed] = useState("0.00");
  const [tradingLossesBf, setTradingLossesBf] = useState("0.00");
  const [tradingLossesRelieved, setTradingLossesRelieved] = useState("0.00");
  const [nonTradingIncome, setNonTradingIncome] = useState("0.00");
  const [qualifyingDonations, setQualifyingDonations] = useState("0.00");
  const [taxDeductedAtSource, setTaxDeductedAtSource] = useState("0.00");

  // Capital Allowances Detailed Breakdown
  const [aiaClaimed, setAiaClaimed] = useState("0.00");
  const [fyaClaimed, setFyaClaimed] = useState("0.00");
  const [mainPoolWda, setMainPoolWda] = useState("0.00");
  const [specialRateWda, setSpecialRateWda] = useState("0.00");

  // Director E-Sign modal state
  const [directorName, setDirectorName] = useState("");
  const [directorEmail, setDirectorEmail] = useState("");

  // 1. Fetch Limited Company Clients
  const { data: clients = [] } = useQuery<any[]>({
    queryKey: ["/api/practice/clients"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/practice/clients");
      if (!res.ok) return [];
      return res.json();
    },
    select: (list: any[]) => list.filter((c: any) => c.clientType === "Limited" || !c.clientType),
  });

  useEffect(() => {
    if (!clientId && clients.length > 0) {
      setClientId(String(clients[0].id));
    }
  }, [clients, clientId]);

  const selectedClient = clients.find((c) => String(c.id) === clientId);

  useEffect(() => {
    if (selectedClient?.utrNumber) {
      setUtrNumber(selectedClient.utrNumber);
    }
  }, [selectedClient]);

  // 2. Fetch CT600 Returns for selected client
  const { data: savedReturns = [], refetch: refetchReturns } = useQuery<any[]>({
    queryKey: [`/api/corporation-tax/${clientId}/returns`],
    queryFn: async () => {
      if (!clientId) return [];
      const res = await fetch(`/api/corporation-tax/${clientId}/returns`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!clientId,
  });

  // Statutory CT600 Tax Computation Engine
  const netProfit = parseFloat(netAccountingProfit || "0");
  const disallowable = parseFloat(disallowableExpenses || "0");
  const depreciation = parseFloat(depreciationAddBack || "0");
  const totalCa = parseFloat(capitalAllowancesClaimed || "0") + parseFloat(aiaClaimed || "0") + parseFloat(fyaClaimed || "0") + parseFloat(mainPoolWda || "0") + parseFloat(specialRateWda || "0");
  const lossRelief = parseFloat(tradingLossesRelieved || "0");
  const nonTrading = parseFloat(nonTradingIncome || "0");
  const donations = parseFloat(qualifyingDonations || "0");

  const taxableTradingProfit = Math.max(0, netProfit + disallowable + depreciation - totalCa - lossRelief);
  const profitsChargeableToCt = Math.max(0, taxableTradingProfit + nonTrading - donations);

  // UK Corporation Tax Rates & Marginal Relief
  let ctRate = 19.0;
  let marginalRelief = 0;
  let corporationTaxPayable = 0;

  if (profitsChargeableToCt <= 50000) {
    ctRate = 19.0;
    corporationTaxPayable = profitsChargeableToCt * 0.19;
  } else if (profitsChargeableToCt >= 250000) {
    ctRate = 25.0;
    corporationTaxPayable = profitsChargeableToCt * 0.25;
  } else {
    ctRate = 25.0;
    const fullTax = profitsChargeableToCt * 0.25;
    marginalRelief = (250000 - profitsChargeableToCt) * (3 / 200);
    corporationTaxPayable = Math.max(0, fullTax - marginalRelief);
  }

  const taxDeducted = parseFloat(taxDeductedAtSource || "0");
  const netTaxDue = Math.max(0, corporationTaxPayable - taxDeducted);

  // MUTATIONS

  // 1. Save Return
  const saveReturnMutation = useMutation({
    mutationFn: async () => {
      if (!clientId) throw new Error("Please select a limited company client");
      return await apiRequest("POST", `/api/corporation-tax/${clientId}/returns`, {
        utrNumber,
        accountingPeriodStart: periodStart,
        accountingPeriodEnd: periodEnd,
        taxYear,
        turnover,
        netAccountingProfit,
        disallowableExpenses,
        depreciationAddBack,
        capitalAllowancesClaimed: totalCa.toFixed(2),
        tradingLossesBroughtForward: tradingLossesBf,
        tradingLossesRelievedCurrentYear: lossRelief.toFixed(2),
        nonTradingIncome,
        qualifyingDonations,
        taxDeductedAtSource,
      });
    },
    onSuccess: () => {
      toast({ title: "CT600 Tax Return Saved", description: "Statutory computation updated in database." });
      refetchReturns();
    },
    onError: (err: any) => {
      toast({ title: "Error Saving CT600", description: err.message, variant: "destructive" });
    },
  });

  // 2. Validate Return
  const validateMutation = useMutation({
    mutationFn: async (returnId: number) => {
      return await apiRequest("POST", `/api/corporation-tax/${clientId}/returns/${returnId}/validate`);
    },
    onSuccess: (data: any) => {
      if (data.isValid) {
        toast({ title: "Passed HMRC Validation", description: `IR Mark Generated: ${data.irMark}` });
      } else {
        toast({ title: "Validation Warning", description: data.errors.join(", "), variant: "destructive" });
      }
      refetchReturns();
    },
  });

  // 3. Submit to HMRC XML Gateway
  const submitToHmrcMutation = useMutation({
    mutationFn: async (returnId: number) => {
      return await apiRequest("POST", `/api/corporation-tax/${clientId}/returns/${returnId}/submit`);
    },
    onSuccess: (data: any) => {
      toast({
        title: "CT600 Filed with HMRC",
        description: `Correlation Reference: ${data.correlationId}`,
      });
      refetchReturns();
    },
    onError: (err: any) => {
      toast({ title: "Submission Failed", description: err.message, variant: "destructive" });
    },
  });

  // 4. Send to Capisign E-Sign
  const sendCapisignMutation = useMutation({
    mutationFn: async (returnId: number) => {
      return await apiRequest("POST", `/api/corporation-tax/${clientId}/returns/${returnId}/send-to-capisign`, {
        directorName,
        directorEmail,
      });
    },
    onSuccess: (data: any) => {
      toast({
        title: "Sent for Capisign Signature",
        description: `Signing link generated for ${directorName || "Director"}.`,
      });
      refetchReturns();
    },
  });

  return (
    <AppLayout sidebar={sidebar} module="Corporation Tax">
      <div className="bg-slate-50 dark:bg-slate-950 min-h-screen text-xs p-6 space-y-6 w-full mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div>
            <div className="flex items-center gap-2">
              <Building2 size={16} className="text-indigo-600" />
              <h1 className="text-base font-bold text-slate-900 dark:text-slate-100">CT600 Corporation Tax Computation & Filing</h1>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              HMRC-compliant CT600 return generator with Capital Allowances, Marginal Relief & XML Gateway submission.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Client Picker */}
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold"
            >
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.clientName} (UTR: {c.utrNumber || "N/A"})
                </option>
              ))}
            </select>

            <button
              onClick={() => saveReturnMutation.mutate()}
              disabled={saveReturnMutation.isPending || !clientId}
              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium shadow-xs flex items-center gap-1.5 disabled:opacity-50"
            >
              <Save size={13} /> {saveReturnMutation.isPending ? "Calculating..." : "Save CT600 Computation"}
            </button>
          </div>
        </div>

        {/* Main Grid: Form Inputs vs Live Computation Card */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: CT600 Form Inputs (7 cols) */}
          <div className="lg:col-span-7 space-y-5">
            {/* Period & Tax Reference */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4">
              <h3 className="font-bold text-xs text-slate-900 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-2">
                1. Company & Accounting Period Details
              </h3>
              <div className="grid grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">Company UTR (10 Digits)</label>
                  <input
                    type="text"
                    maxLength={10}
                    value={utrNumber}
                    onChange={(e) => setUtrNumber(e.target.value)}
                    placeholder="e.g. 1234567890"
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">AP Start Date</label>
                  <input
                    type="date"
                    value={periodStart}
                    onChange={(e) => setPeriodStart(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">AP End Date</label>
                  <input
                    type="date"
                    value={periodEnd}
                    onChange={(e) => setPeriodEnd(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Trading Profits & Disallowables */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4">
              <h3 className="font-bold text-xs text-slate-900 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-2">
                2. Trading Profit & Add-Backs
              </h3>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">Turnover / Gross Sales (£)</label>
                  <input
                    type="number"
                    value={turnover}
                    onChange={(e) => setTurnover(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">Net Accounting Profit per Accounts (£)</label>
                  <input
                    type="number"
                    value={netAccountingProfit}
                    onChange={(e) => setNetAccountingProfit(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">Depreciation Added Back (£)</label>
                  <input
                    type="number"
                    value={depreciationAddBack}
                    onChange={(e) => setDepreciationAddBack(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">Disallowable Expenses (Fines, Client Entertainment) (£)</label>
                  <input
                    type="number"
                    value={disallowableExpenses}
                    onChange={(e) => setDisallowableExpenses(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
              </div>
            </div>

            {/* Capital Allowances & Loss Relief */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4">
              <h3 className="font-bold text-xs text-slate-900 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-2">
                3. Capital Allowances & Trading Losses
              </h3>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">Annual Investment Allowance (AIA @ 100%) (£)</label>
                  <input
                    type="number"
                    value={aiaClaimed}
                    onChange={(e) => setAiaClaimed(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">Main Pool WDA (@ 18%) (£)</label>
                  <input
                    type="number"
                    value={mainPoolWda}
                    onChange={(e) => setMainPoolWda(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">Trading Losses Brought Forward (£)</label>
                  <input
                    type="number"
                    value={tradingLossesBf}
                    onChange={(e) => setTradingLossesBf(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">Losses Relieved in Current Period (£)</label>
                  <input
                    type="number"
                    value={tradingLossesRelieved}
                    onChange={(e) => setTradingLossesRelieved(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Statutory CT Computation Statement (5 cols) */}
          <div className="lg:col-span-5 space-y-5">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-xs text-slate-900 dark:text-slate-100">Statutory Tax Computation</h3>
                  <p className="text-[10px] text-slate-400">UK CT600 Rules & Marginal Relief</p>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                  Rate: {ctRate.toFixed(1)}%
                </span>
              </div>

              <div className="space-y-2 text-xs font-mono text-slate-700 dark:text-slate-300">
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span>Net Accounting Profit</span>
                  <span className="font-semibold">£{netProfit.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span>Add: Depreciation</span>
                  <span>+£{depreciation.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span>Add: Disallowable Expenses</span>
                  <span>+£{disallowable.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span>Less: Capital Allowances</span>
                  <span>-£{totalCa.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span>Less: Loss Relief</span>
                  <span>-£{lossRelief.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-1 font-bold text-indigo-600 bg-slate-50 dark:bg-slate-800 px-2 rounded">
                  <span>Profits Chargeable to CT</span>
                  <span>£{profitsChargeableToCt.toFixed(2)}</span>
                </div>
                {marginalRelief > 0 && (
                  <div className="flex justify-between py-1 text-emerald-600 border-b border-slate-100 dark:border-slate-800">
                    <span>Less: Marginal Relief</span>
                    <span>-£{marginalRelief.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between py-2 font-bold text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 px-2 rounded">
                  <span>Corporation Tax Payable</span>
                  <span>£{corporationTaxPayable.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-2 font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 px-2 rounded border border-indigo-200 dark:border-indigo-800">
                  <span>Net Corporation Tax Due</span>
                  <span>£{netTaxDue.toFixed(2)}</span>
                </div>
              </div>

              {/* Statutory Due Dates Alert */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg text-[11px] text-slate-500 space-y-1">
                <div className="flex justify-between">
                  <span>Tax Payment Deadline:</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">9 Months 1 Day</span>
                </div>
                <div className="flex justify-between">
                  <span>CT600 Return Filing Deadline:</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">12 Months</span>
                </div>
              </div>
            </div>

            {/* Capisign Director Sign-Off Card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-3">
              <h3 className="font-bold text-xs text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <FileSignature size={14} className="text-indigo-600" />
                Director Capisign E-Signature
              </h3>
              <div className="space-y-2 text-xs">
                <input
                  type="text"
                  placeholder="Director Name"
                  value={directorName}
                  onChange={(e) => setDirectorName(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                />
                <input
                  type="email"
                  placeholder="Director Email"
                  value={directorEmail}
                  onChange={(e) => setDirectorEmail(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                />
                <button
                  onClick={() => savedReturns[0] && sendCapisignMutation.mutate(savedReturns[0].id)}
                  disabled={sendCapisignMutation.isPending || !savedReturns.length}
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium shadow-xs disabled:opacity-50"
                >
                  {sendCapisignMutation.isPending ? "Dispatching..." : "Send CT600 for Director E-Sign"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Panel: Saved Returns & HMRC Submission Log */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="font-bold text-xs text-slate-900 dark:text-slate-100">Saved CT600 Returns & HMRC Submissions</h3>
            <button
              onClick={() => refetchReturns()}
              className="text-indigo-600 hover:underline flex items-center gap-1 text-[11px]"
            >
              <RefreshCw size={11} /> Refresh History
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-4">Period End</th>
                  <th className="py-2.5 px-4">Tax Year</th>
                  <th className="py-2.5 px-4">Taxable Profits</th>
                  <th className="py-2.5 px-4">Net Tax Due</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4">Correlation Ref</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {savedReturns.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-slate-400">
                      No CT600 returns saved yet. Fill in the computation above and click &apos;Save CT600 Computation&apos;.
                    </td>
                  </tr>
                ) : (
                  savedReturns.map((ret: any) => (
                    <tr key={ret.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-4 font-semibold">{new Date(ret.accountingPeriodEnd).toLocaleDateString("en-GB")}</td>
                      <td className="py-3 px-4">{ret.taxYear}</td>
                      <td className="py-3 px-4 font-mono">£{parseFloat(ret.profitsChargeableToCt).toFixed(2)}</td>
                      <td className="py-3 px-4 font-mono font-bold text-indigo-600">£{parseFloat(ret.netTaxDue).toFixed(2)}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${ret.status === "Accepted"
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                            : ret.status === "Validated"
                              ? "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300"
                              : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                            }`}
                        >
                          {ret.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-400">{ret.hmrcCorrelationId || "—"}</td>
                      <td className="py-3 px-4 text-right space-x-2">
                        {ret.status !== "Accepted" && (
                          <>
                            <button
                              onClick={() => validateMutation.mutate(ret.id)}
                              disabled={validateMutation.isPending}
                              className="px-2.5 py-1 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 rounded text-[11px] font-medium"
                            >
                              Validate
                            </button>
                            <button
                              onClick={() => submitToHmrcMutation.mutate(ret.id)}
                              disabled={submitToHmrcMutation.isPending}
                              className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-[11px] font-medium shadow-xs"
                            >
                              Submit to HMRC
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
