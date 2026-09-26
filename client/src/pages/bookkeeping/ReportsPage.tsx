import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import AppLayout from "../../components/layout/AppLayout";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "../../lib/queryClient";
import {
  FileDown, TrendingUp, TrendingDown, DollarSign,
  BarChart2, Users, Truck, Scale, FileText, RefreshCw
} from "lucide-react";
import { bookkeepingSidebar, getClientSidebar } from "./sidebar";
import ClientGuard from "./ClientGuard";

type ReportTab = "pl" | "balance-sheet" | "trial-balance" | "aged-debtors" | "aged-creditors";

export default function ReportsPage() {
  const [match1, params1] = useRoute("/bookkeeping/:id/reports");
  const [match2, params2] = useRoute("/bookkeeping/:id/*");
  const clientId = match1 ? params1.id : (match2 ? params2.id : "");
  const [, navigate] = useLocation();

  const [activeTab, setActiveTab] = useState<ReportTab>("pl");

  if (!clientId) return <ClientGuard featureTitle="Reports" />;

  // P&L
  const { data: plData = [], isLoading: plLoading } = useQuery({
    queryKey: ["/api/bookkeeping/reports", clientId, "profit-loss"],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/bookkeeping/reports/${clientId}/profit-loss`);
      if (!res.ok) return [];
      const data = await res.json();
      return data.plData || [];
    },
    enabled: !!clientId && activeTab === "pl",
  });

  // Invoices for Aged Debtors
  const { data: invoices = [], isLoading: invLoading } = useQuery({
    queryKey: ["/api/bookkeeping/invoices/client", clientId],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/bookkeeping/invoices/client/${clientId}`);
      return res.ok ? res.json() : [];
    },
    enabled: !!clientId && activeTab === "aged-debtors",
  });

  // Purchases for Aged Creditors
  const { data: purchases = [], isLoading: purLoading } = useQuery({
    queryKey: ["/api/bookkeeping/purchases/client", clientId],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/bookkeeping/purchases/client/${clientId}`);
      return res.ok ? res.json() : [];
    },
    enabled: !!clientId && activeTab === "aged-creditors",
  });

  const totalIncome = plData.filter((r: any) => r.type === "income").reduce((s: number, r: any) => s + r.amount, 0);
  const totalExpenses = plData.filter((r: any) => r.type === "expense").reduce((s: number, r: any) => s + r.amount, 0);
  const netProfit = totalIncome - totalExpenses;

  const fmt = (n: number) => `£${n.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  // Aged debtors buckets
  const today = new Date();
  const agingBuckets = (items: any[], dateField: string, amountField: string) => {
    const unpaid = items.filter((i: any) => !i.isPaid && !i.paidAt);
    return {
      current: unpaid.filter((i: any) => {
        const due = new Date(i[dateField]);
        const diff = (today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24);
        return diff <= 0;
      }),
      days0_30: unpaid.filter((i: any) => {
        const due = new Date(i[dateField]);
        const diff = (today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24);
        return diff > 0 && diff <= 30;
      }),
      days31_60: unpaid.filter((i: any) => {
        const due = new Date(i[dateField]);
        const diff = (today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24);
        return diff > 31 && diff <= 60;
      }),
      days61_90: unpaid.filter((i: any) => {
        const due = new Date(i[dateField]);
        const diff = (today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24);
        return diff > 61 && diff <= 90;
      }),
      over90: unpaid.filter((i: any) => {
        const due = new Date(i[dateField]);
        const diff = (today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24);
        return diff > 90;
      }),
    };
  };

  const debtorBuckets = agingBuckets(invoices, "dueDate", "totalAmount");
  const creditorBuckets = agingBuckets(purchases, "dueDate", "totalAmount");

  const sumItems = (items: any[]) => items.reduce((s: number, i: any) => s + (parseFloat(i.totalAmount || i.amount || 0)), 0);

  const tabs = [
    { id: "pl" as ReportTab, label: "Profit & Loss", icon: <TrendingUp size={14} /> },
    { id: "balance-sheet" as ReportTab, label: "Balance Sheet", icon: <Scale size={14} /> },
    { id: "trial-balance" as ReportTab, label: "Trial Balance", icon: <BarChart2 size={14} /> },
    { id: "aged-debtors" as ReportTab, label: "Aged Debtors", icon: <Users size={14} /> },
    { id: "aged-creditors" as ReportTab, label: "Aged Creditors", icon: <Truck size={14} /> },
  ];

  return (
    <AppLayout sidebar={clientId ? getClientSidebar(clientId) : bookkeepingSidebar} module="Bookkeeping">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-xs text-gray-400">Home / Bookkeeping / Reports</p>
            <h1 className="text-lg font-bold text-gray-800 mt-0.5">Financial Reports</h1>
          </div>
          <div className="flex gap-2">
            <select className="text-sm border border-gray-200 rounded-lg px-3 py-2">
              <option>2025/2026</option>
              <option>2024/2025</option>
              <option>2023/2024</option>
            </select>
            <button className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 flex items-center gap-2 hover:bg-gray-50">
              <FileDown size={14} /> Export PDF
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-6 overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all whitespace-nowrap ${activeTab === tab.id ? "bg-white text-purple-700 shadow-sm" : "text-gray-500 hover:text-gray-800"}`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* P&L Report */}
        {activeTab === "pl" && (
          <>
            {plLoading ? (
              <div className="flex items-center gap-2 text-gray-400 text-sm py-8"><RefreshCw size={14} className="animate-spin" /> Loading P&L data...</div>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-5 mb-6">
                  <div className="SanSuite-card p-5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-green-50"><TrendingUp size={18} className="text-green-600" /></div>
                      <div><p className="text-xs text-gray-400">Total Income</p><p className="text-xl font-bold text-green-600">{fmt(totalIncome)}</p></div>
                    </div>
                  </div>
                  <div className="SanSuite-card p-5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-red-50"><TrendingDown size={18} className="text-red-500" /></div>
                      <div><p className="text-xs text-gray-400">Total Expenses</p><p className="text-xl font-bold text-red-600">{fmt(totalExpenses)}</p></div>
                    </div>
                  </div>
                  <div className="SanSuite-card p-5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "#6c5ce720" }}><DollarSign size={18} style={{ color: "#6c5ce7" }} /></div>
                      <div><p className="text-xs text-gray-400">Net Profit</p><p className="text-xl font-bold" style={{ color: "#6c5ce7" }}>{fmt(netProfit)}</p></div>
                    </div>
                  </div>
                </div>
                <div className="SanSuite-card overflow-hidden">
                  <div className="px-5 py-3 bg-gray-50 border-b"><h3 className="font-semibold text-sm text-gray-700">Income</h3></div>
                  <table className="SanSuite-table">
                    <thead><tr><th>Account</th><th>Amount</th></tr></thead>
                    <tbody>
                      {plData.filter((r: any) => r.type === "income").length === 0 ? (
                        <tr><td colSpan={2} className="text-center py-6 text-gray-400 text-sm">No income records found for this period.</td></tr>
                      ) : (
                        plData.filter((r: any) => r.type === "income").map((row: any) => (
                          <tr key={row.label}><td>{row.label}</td><td className="text-green-600 font-medium">{fmt(row.amount)}</td></tr>
                        ))
                      )}
                      <tr className="bg-green-50 font-bold"><td>Total Income</td><td className="text-green-700">{fmt(totalIncome)}</td></tr>
                    </tbody>
                  </table>
                  <div className="px-5 py-3 bg-gray-50 border-b border-t"><h3 className="font-semibold text-sm text-gray-700">Expenses</h3></div>
                  <table className="SanSuite-table">
                    <tbody>
                      {plData.filter((r: any) => r.type === "expense").length === 0 ? (
                        <tr><td colSpan={2} className="text-center py-6 text-gray-400 text-sm">No expense records found for this period.</td></tr>
                      ) : (
                        plData.filter((r: any) => r.type === "expense").map((row: any) => (
                          <tr key={row.label}><td>{row.label}</td><td className="text-red-600 font-medium">{fmt(row.amount)}</td></tr>
                        ))
                      )}
                      <tr className="bg-red-50 font-bold"><td>Total Expenses</td><td className="text-red-700">{fmt(totalExpenses)}</td></tr>
                    </tbody>
                  </table>
                  <div className="px-5 py-4 border-t" style={{ background: "#6c5ce710" }}>
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-gray-800">Net Profit / (Loss)</span>
                      <span className="font-bold text-lg" style={{ color: "#6c5ce7" }}>{fmt(netProfit)}</span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {/* Balance Sheet */}
        {activeTab === "balance-sheet" && (
          <div className="SanSuite-card overflow-hidden">
            <div className="px-5 py-4 border-b bg-gradient-to-r from-purple-50 to-white">
              <h3 className="font-bold text-gray-800 flex items-center gap-2"><Scale size={16} className="text-purple-600" /> Balance Sheet</h3>
              <p className="text-xs text-gray-500 mt-0.5">As at end of selected accounting period</p>
            </div>
            {/* Assets */}
            <div className="px-5 py-3 bg-gray-50 border-b"><h4 className="text-xs font-bold text-gray-600 uppercase tracking-wide">Assets</h4></div>
            <table className="SanSuite-table">
              <thead><tr><th>Account</th><th className="text-right">£</th></tr></thead>
              <tbody>
                <tr><td className="text-gray-500 pl-8">Trade Debtors</td><td className="text-right">{fmt(sumItems(invoices.filter((i: any) => !i.isPaid)))}</td></tr>
                <tr><td className="text-gray-500 pl-8">Cash at Bank</td><td className="text-right">—</td></tr>
                <tr><td className="text-gray-500 pl-8">Fixed Assets (Net)</td><td className="text-right">—</td></tr>
                <tr className="font-bold bg-purple-50"><td>Total Assets</td><td className="text-right">{fmt(sumItems(invoices.filter((i: any) => !i.isPaid)))}</td></tr>
              </tbody>
            </table>
            {/* Liabilities */}
            <div className="px-5 py-3 bg-gray-50 border-b border-t"><h4 className="text-xs font-bold text-gray-600 uppercase tracking-wide">Liabilities</h4></div>
            <table className="SanSuite-table">
              <tbody>
                <tr><td className="text-gray-500 pl-8">Trade Creditors</td><td className="text-right">{fmt(sumItems(purchases.filter((p: any) => !p.isPaid)))}</td></tr>
                <tr><td className="text-gray-500 pl-8">VAT Liability</td><td className="text-right">—</td></tr>
                <tr className="font-bold bg-red-50"><td>Total Liabilities</td><td className="text-right">{fmt(sumItems(purchases.filter((p: any) => !p.isPaid)))}</td></tr>
              </tbody>
            </table>
            <div className="px-5 py-4 border-t" style={{ background: "#6c5ce710" }}>
              <div className="flex justify-between items-center">
                <span className="font-bold text-gray-800">Net Assets / (Equity)</span>
                <span className="font-bold text-lg" style={{ color: "#6c5ce7" }}>
                  {fmt(sumItems(invoices.filter((i: any) => !i.isPaid)) - sumItems(purchases.filter((p: any) => !p.isPaid)))}
                </span>
              </div>
            </div>
            <p className="text-xs text-gray-400 px-5 py-3 border-t">Balance Sheet figures are derived from live invoice/purchase data. For a full accruals-based balance sheet, all journal entries including fixed assets, depreciation, and opening balances must be posted.</p>
          </div>
        )}

        {/* Trial Balance */}
        {activeTab === "trial-balance" && (
          <div className="SanSuite-card overflow-hidden">
            <div className="px-5 py-4 border-b bg-gradient-to-r from-blue-50 to-white">
              <h3 className="font-bold text-gray-800 flex items-center gap-2"><BarChart2 size={16} className="text-blue-600" /> Trial Balance</h3>
              <p className="text-xs text-gray-500 mt-0.5">Debit and credit balances for all chart of accounts entries</p>
            </div>
            <table className="SanSuite-table">
              <thead>
                <tr>
                  <th>Account</th>
                  <th className="text-right">Debit £</th>
                  <th className="text-right">Credit £</th>
                </tr>
              </thead>
              <tbody>
                <tr><td>Sales Revenue</td><td className="text-right text-gray-400">—</td><td className="text-right text-green-700 font-medium">{fmt(totalIncome)}</td></tr>
                <tr><td>Cost of Sales / Expenses</td><td className="text-right text-red-700 font-medium">{fmt(totalExpenses)}</td><td className="text-right text-gray-400">—</td></tr>
                <tr><td>Trade Debtors</td><td className="text-right font-medium">{fmt(sumItems(invoices.filter((i: any) => !i.isPaid)))}</td><td className="text-right text-gray-400">—</td></tr>
                <tr><td>Trade Creditors</td><td className="text-right text-gray-400">—</td><td className="text-right font-medium">{fmt(sumItems(purchases.filter((p: any) => !p.isPaid)))}</td></tr>
                <tr className="font-bold bg-gray-50 border-t-2 border-gray-300">
                  <td>Total</td>
                  <td className="text-right">{fmt(totalExpenses + sumItems(invoices.filter((i: any) => !i.isPaid)))}</td>
                  <td className="text-right">{fmt(totalIncome + sumItems(purchases.filter((p: any) => !p.isPaid)))}</td>
                </tr>
              </tbody>
            </table>
            <p className="text-xs text-gray-400 px-5 py-3 border-t">Full trial balance requires all journal entries to be posted. Data shown is derived from live transactions only.</p>
          </div>
        )}

        {/* Aged Debtors */}
        {activeTab === "aged-debtors" && (
          <div className="space-y-4">
            <div className="grid grid-cols-5 gap-3">
              {[
                { label: "Current (Not Due)", items: debtorBuckets.current, color: "green" },
                { label: "1–30 Days", items: debtorBuckets.days0_30, color: "yellow" },
                { label: "31–60 Days", items: debtorBuckets.days31_60, color: "orange" },
                { label: "61–90 Days", items: debtorBuckets.days61_90, color: "red" },
                { label: "Over 90 Days", items: debtorBuckets.over90, color: "red" },
              ].map(bucket => (
                <div key={bucket.label} className="SanSuite-card p-4 text-center">
                  <p className="text-xs text-gray-500 mb-1">{bucket.label}</p>
                  <p className={`text-lg font-bold ${bucket.color === "green" ? "text-green-600" : bucket.color === "yellow" ? "text-yellow-600" : bucket.color === "orange" ? "text-orange-600" : "text-red-600"}`}>
                    {fmt(sumItems(bucket.items))}
                  </p>
                  <p className="text-xs text-gray-400">{bucket.items.length} invoice{bucket.items.length !== 1 ? "s" : ""}</p>
                </div>
              ))}
            </div>
            <div className="SanSuite-card overflow-hidden">
              <div className="px-5 py-3 bg-gradient-to-r from-orange-50 to-white border-b">
                <h3 className="font-bold text-gray-800 flex items-center gap-2"><Users size={16} className="text-orange-600" /> Aged Debtors (Customer)</h3>
                <p className="text-xs text-gray-500">Outstanding sales invoices by age</p>
              </div>
              {invLoading ? (
                <div className="flex items-center gap-2 text-gray-400 text-sm py-6 px-5"><RefreshCw size={14} className="animate-spin" /> Loading...</div>
              ) : invoices.filter((i: any) => !i.isPaid).length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm">No outstanding debtor invoices found.</div>
              ) : (
                <table className="SanSuite-table">
                  <thead><tr><th>Invoice #</th><th>Customer</th><th>Invoice Date</th><th>Due Date</th><th>Days Overdue</th><th className="text-right">Amount</th></tr></thead>
                  <tbody>
                    {invoices.filter((i: any) => !i.isPaid).map((inv: any) => {
                      const due = new Date(inv.dueDate);
                      const daysOverdue = Math.max(0, Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24)));
                      return (
                        <tr key={inv.id}>
                          <td className="font-mono text-xs">{inv.invoiceNumber || `INV-${inv.id}`}</td>
                          <td>{inv.customerName || inv.contactName || "—"}</td>
                          <td>{inv.invoiceDate ? new Date(inv.invoiceDate).toLocaleDateString("en-GB") : "—"}</td>
                          <td>{inv.dueDate ? new Date(inv.dueDate).toLocaleDateString("en-GB") : "—"}</td>
                          <td>
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${daysOverdue === 0 ? "bg-green-100 text-green-700" : daysOverdue <= 30 ? "bg-yellow-100 text-yellow-700" : daysOverdue <= 60 ? "bg-orange-100 text-orange-700" : "bg-red-100 text-red-700"}`}>
                              {daysOverdue === 0 ? "Current" : `${daysOverdue} days`}
                            </span>
                          </td>
                          <td className="text-right font-semibold">{fmt(parseFloat(inv.totalAmount || inv.amount || 0))}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* Aged Creditors */}
        {activeTab === "aged-creditors" && (
          <div className="space-y-4">
            <div className="grid grid-cols-5 gap-3">
              {[
                { label: "Current (Not Due)", items: creditorBuckets.current, color: "green" },
                { label: "1–30 Days", items: creditorBuckets.days0_30, color: "yellow" },
                { label: "31–60 Days", items: creditorBuckets.days31_60, color: "orange" },
                { label: "61–90 Days", items: creditorBuckets.days61_90, color: "red" },
                { label: "Over 90 Days", items: creditorBuckets.over90, color: "red" },
              ].map(bucket => (
                <div key={bucket.label} className="SanSuite-card p-4 text-center">
                  <p className="text-xs text-gray-500 mb-1">{bucket.label}</p>
                  <p className={`text-lg font-bold ${bucket.color === "green" ? "text-green-600" : bucket.color === "yellow" ? "text-yellow-600" : bucket.color === "orange" ? "text-orange-600" : "text-red-600"}`}>
                    {fmt(sumItems(bucket.items))}
                  </p>
                  <p className="text-xs text-gray-400">{bucket.items.length} invoice{bucket.items.length !== 1 ? "s" : ""}</p>
                </div>
              ))}
            </div>
            <div className="SanSuite-card overflow-hidden">
              <div className="px-5 py-3 bg-gradient-to-r from-blue-50 to-white border-b">
                <h3 className="font-bold text-gray-800 flex items-center gap-2"><Truck size={16} className="text-blue-600" /> Aged Creditors (Supplier)</h3>
                <p className="text-xs text-gray-500">Outstanding purchase invoices by age</p>
              </div>
              {purLoading ? (
                <div className="flex items-center gap-2 text-gray-400 text-sm py-6 px-5"><RefreshCw size={14} className="animate-spin" /> Loading...</div>
              ) : purchases.filter((p: any) => !p.isPaid).length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm">No outstanding creditor invoices found.</div>
              ) : (
                <table className="SanSuite-table">
                  <thead><tr><th>Invoice #</th><th>Supplier</th><th>Invoice Date</th><th>Due Date</th><th>Days Overdue</th><th className="text-right">Amount</th></tr></thead>
                  <tbody>
                    {purchases.filter((p: any) => !p.isPaid).map((pur: any) => {
                      const due = new Date(pur.dueDate);
                      const daysOverdue = Math.max(0, Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24)));
                      return (
                        <tr key={pur.id}>
                          <td className="font-mono text-xs">{pur.invoiceNumber || `PUR-${pur.id}`}</td>
                          <td>{pur.supplierName || pur.contactName || "—"}</td>
                          <td>{pur.invoiceDate ? new Date(pur.invoiceDate).toLocaleDateString("en-GB") : "—"}</td>
                          <td>{pur.dueDate ? new Date(pur.dueDate).toLocaleDateString("en-GB") : "—"}</td>
                          <td>
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${daysOverdue === 0 ? "bg-green-100 text-green-700" : daysOverdue <= 30 ? "bg-yellow-100 text-yellow-700" : daysOverdue <= 60 ? "bg-orange-100 text-orange-700" : "bg-red-100 text-red-700"}`}>
                              {daysOverdue === 0 ? "Current" : `${daysOverdue} days`}
                            </span>
                          </td>
                          <td className="text-right font-semibold">{fmt(parseFloat(pur.totalAmount || pur.amount || 0))}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
