import React from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import AppLayout from "../../components/layout/AppLayout";
import { apiRequest } from "../../lib/queryClient";
import { FileBarChart, Download, ArrowRight, ChevronDown, ChevronUp } from "lucide-react";
import { bookkeepingSidebar, getClientSidebar } from "./sidebar";
import ClientGuard from "./ClientGuard";
import { useState } from "react";

function VatPeriodDetails({ periodId }: { periodId: number }) {
  const { data, isLoading, error } = useQuery({
    queryKey: [`/api/bookkeeping/vat-period/${periodId}/calculate`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/bookkeeping/vat-period/${periodId}/calculate`);
      if (!res.ok) throw new Error("Failed to calculate");
      return res.json();
    }
  });

  if (isLoading) return <div className="p-8 text-center text-sm text-gray-500">Calculating 9-Box Return...</div>;
  if (error) return <div className="p-8 text-center text-sm text-red-500">Failed to calculate return.</div>;
  if (!data) return null;

  const boxes = [
    { box: "1", desc: "VAT due in this period on sales and other outputs", val: data.box1 },
    { box: "2", desc: "VAT due in this period on acquisitions from other EC Member States", val: data.box2 },
    { box: "3", desc: "Total VAT due (the sum of boxes 1 and 2)", val: data.box3, highlight: true },
    { box: "4", desc: "VAT reclaimed in this period on purchases and other inputs", val: data.box4 },
    { box: "5", desc: "Net VAT to pay to HMRC or reclaim (difference between boxes 3 and 4)", val: data.box5, highlight: true, total: true },
    { box: "6", desc: "Total value of sales and all other outputs excluding any VAT", val: data.box6 },
    { box: "7", desc: "Total value of purchases and all other inputs excluding any VAT", val: data.box7 },
    { box: "8", desc: "Total value of all supplies of goods and related costs to other EC Member States", val: data.box8 },
    { box: "9", desc: "Total value of all acquisitions of goods and related costs from other EC Member States", val: data.box9 },
  ];

  return (
    <div className="p-6 bg-gray-50/80 border-t border-gray-100 shadow-inner">
      <h3 className="font-semibold text-gray-800 mb-4 text-sm uppercase tracking-wider">HMRC 9-Box VAT Return Details</h3>
      <div className="grid gap-3">
        {boxes.map(b => (
          <div key={b.box} className={`flex items-center justify-between p-3 rounded-lg border ${b.total ? 'bg-purple-50 border-purple-200' : b.highlight ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200'}`}>
            <div className="flex gap-4 items-center">
              <span className={`w-8 h-8 flex items-center justify-center rounded font-bold text-sm ${b.total ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                {b.box}
              </span>
              <span className={`text-sm ${b.total ? 'text-purple-900 font-medium' : 'text-gray-600'}`}>{b.desc}</span>
            </div>
            <span className={`font-mono text-base ${b.total ? 'font-bold text-purple-700' : b.highlight ? 'font-semibold text-gray-900' : 'text-gray-800'}`}>
              £{parseFloat(b.val).toLocaleString("en-GB", { minimumFractionDigits: 2 })}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function VatReportPage() {
  const [match, params] = useRoute("/bookkeeping/:id/vat-report");
  const clientId = match ? params.id : "";
  const [, navigate] = useLocation();
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const { data: clients = [] } = useQuery({
    queryKey: ["/api/practice/clients"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/practice/clients");
      return res.json();
    },
  });
  const client = clients.find((c: any) => String(c.id) === clientId);

  const { data: vatPeriods = [], isLoading } = useQuery({
    queryKey: ["/api/bookkeeping/vat"], // Shared endpoint
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/bookkeeping/vat`);
      return res.json();
    }
  });

  const clientVatPeriods = vatPeriods.filter((v: any) => String(v.clientId) === clientId);

  if (!clientId) {
    return <ClientGuard featureTitle="VAT Report" />;
  }

  return (
    <AppLayout sidebar={clientId ? getClientSidebar(clientId) : bookkeepingSidebar} module="Bookkeeping">
      <div className="bg-gray-50 min-h-screen">
        <div className="bg-white px-4 py-2 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center text-sm text-gray-500 gap-2">
            <button onClick={() => navigate("/bookkeeping")} className="hover:text-purple-600">Bookkeeping</button>
            <span>/</span>
            <span className="font-medium text-gray-800">{client?.clientName || "Client"}</span>
            <span>/</span>
            <span className="text-gray-800">VAT Returns</span>
          </div>
          <button className="text-gray-500 hover:text-purple-600 flex items-center gap-1 text-sm font-medium">
            <Download size={14} /> Export All
          </button>
        </div>

        <div className="p-6 max-w-6xl mx-auto space-y-6">
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center">
                  <FileBarChart size={16} />
                </div>
                <div>
                  <h2 className="font-semibold text-gray-800">VAT Return Reports (VAT100)</h2>
                  <p className="text-xs text-gray-500">Review calculated VAT boxes before submitting to HMRC via MTD.</p>
                </div>
              </div>
              <button onClick={() => navigate(`/bookkeeping/${clientId}/mtd-portal`)} className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-sm font-medium flex items-center gap-1 transition-colors">
                Go to MTD Portal <ArrowRight size={14} />
              </button>
            </div>
            
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 text-xs font-semibold text-gray-500 border-b border-gray-200 uppercase">
                  <th className="px-5 py-3">Description</th>
                  <th className="px-5 py-3">Period</th>
                  <th className="px-5 py-3 text-right">Box 3 (Total Output VAT)</th>
                  <th className="px-5 py-3 text-right">Box 4 (Total Input VAT)</th>
                  <th className="px-5 py-3 text-right">Box 5 (Net VAT Due)</th>
                  <th className="px-5 py-3 text-center">Status</th>
                  <th className="px-5 py-3 w-10"></th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {isLoading ? (
                  <tr><td colSpan={6} className="text-center py-10 text-gray-400">Loading periods...</td></tr>
                ) : clientVatPeriods.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12">
                      <p className="text-gray-500 mb-2">No VAT periods generated yet.</p>
                      <button className="text-purple-600 hover:underline text-sm font-medium">Generate New VAT Return</button>
                    </td>
                  </tr>
                ) : clientVatPeriods.map((v: any) => (
                  <React.Fragment key={v.id}>
                    <tr 
                      className={`border-b border-gray-100 hover:bg-gray-50/50 cursor-pointer transition-colors ${expandedId === v.id ? 'bg-gray-50/80' : ''}`}
                      onClick={() => setExpandedId(expandedId === v.id ? null : v.id)}
                    >
                      <td className="px-5 py-3 font-medium text-purple-700">{v.description}</td>
                      <td className="px-5 py-3 text-gray-600">
                        {new Date(v.fromDate).toLocaleDateString()} - {new Date(v.toDate).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-3 text-right font-mono text-gray-800">£{parseFloat(v.vatDueOnSales || 0).toFixed(2)}</td>
                      <td className="px-5 py-3 text-right font-mono text-gray-800">£{parseFloat(v.vatReclaimedOnPurchases || 0).toFixed(2)}</td>
                      <td className="px-5 py-3 text-right font-mono font-bold text-gray-800 border-x border-gray-100 bg-gray-50/30">
                        £{parseFloat(v.netVatDue || 0).toFixed(2)}
                      </td>
                      <td className="px-5 py-3 text-center">
                        <span className={`px-2 py-1 rounded-full text-[10px] font-semibold uppercase ${v.vatStatus === 'Submitted' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                          {v.vatStatus || "Calculated"}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-gray-400">
                        {expandedId === v.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </td>
                    </tr>
                    {expandedId === v.id && (
                      <tr>
                        <td colSpan={7} className="p-0 border-b border-gray-200">
                          <VatPeriodDetails periodId={v.id} />
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
