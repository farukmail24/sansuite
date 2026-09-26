import { useState } from "react";
import { useLocation, useRoute } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AppLayout from "../../components/layout/AppLayout";
import { bookkeepingSidebar, getClientSidebar } from "./sidebar";
import { apiRequest } from "../../lib/queryClient";
import { useToast } from "../../hooks/useToast";
import ClientGuard from "./ClientGuard";
import { 
  ChevronRight, 
  Search, 
  CheckSquare, 
  RefreshCw, 
  Layers, 
  Filter, 
  Check,
  Trash2,
  AlertTriangle,
  ShieldAlert
} from "lucide-react";

interface TransactionItem {
  id: number;
  refNo: string;
  date: string;
  description: string;
  type: "Sales" | "Purchase";
  amount: number;
  nominalCode: string;
}

export default function BulkEditPage() {
  const [match, params] = useRoute("/bookkeeping/:id/*");
  const clientId = match ? params?.id : "";
  const [, navigate] = useLocation();
  const { toast } = useToast();

  if (!clientId) return <ClientGuard featureTitle="Bulk Edit" />;
  const queryClient = useQueryClient();

  const [activeMode, setActiveMode] = useState<"reclassify" | "delete">("reclassify");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "Sales" | "Purchase">("all");
  const [targetNominal, setTargetNominal] = useState("7500 - General Expenses");

  // Query real invoices
  const { data: invoices = [], isLoading: isLoadingInv } = useQuery<any[]>({
    queryKey: [`/api/bookkeeping/invoices/client/${clientId || 1}`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/bookkeeping/invoices/client/${clientId || 1}`);
      if (!res.ok) return [];
      return res.json();
    },
  });

  // Query real purchases
  const { data: purchases = [], isLoading: isLoadingPur } = useQuery<any[]>({
    queryKey: [`/api/bookkeeping/purchases/client/${clientId || 1}`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/bookkeeping/purchases/client/${clientId || 1}`);
      if (!res.ok) return [];
      return res.json();
    },
  });

  // Combine real invoices & purchases into transaction items
  const combinedTransactions: TransactionItem[] = [
    ...invoices.map((inv: any) => ({
      id: inv.id,
      refNo: inv.invoiceNumber || `INV-${inv.id}`,
      date: inv.invoiceDate ? inv.invoiceDate.substring(0, 10) : "2026-07-01",
      description: inv.notes || `Sales Invoice #${inv.invoiceNumber || inv.id}`,
      type: "Sales" as const,
      amount: parseFloat(inv.grandTotal || "0"),
      nominalCode: "4000 - General Sales"
    })),
    ...purchases.map((pur: any) => ({
      id: pur.id + 10000, // offset to avoid key collision
      refNo: pur.referenceNumber || `PUR-${pur.id}`,
      date: pur.invoiceDate ? pur.invoiceDate.substring(0, 10) : "2026-07-01",
      description: pur.notes || `Supplier Purchase #${pur.referenceNumber || pur.id}`,
      type: "Purchase" as const,
      amount: parseFloat(pur.totalAmount || "0"),
      nominalCode: "5000 - Cost of Goods"
    }))
  ];

  // Transactions directly sourced from authentic database records
  const filteredTransactions = combinedTransactions.filter(t => {
    const matchesSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase()) || t.refNo.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === "all" || t.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredTransactions.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredTransactions.map(t => t.id));
    }
  };

  const bulkReclassifyMutation = useMutation({
    mutationFn: async () => {
      const selectedTxns = filteredTransactions
        .filter(t => selectedIds.includes(t.id))
        .map(t => ({ id: t.id, type: t.type }));

      const res = await apiRequest("POST", "/api/bookkeeping/bulk-reclassify", {
        transactions: selectedTxns,
        targetNominalCode: targetNominal,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to bulk reclassify transactions");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [`/api/bookkeeping/invoices/client/${clientId || 1}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/bookkeeping/purchases/client/${clientId || 1}`] });
      toast({ 
        title: "Bulk Reclassification Complete", 
        description: data.message || `Reclassified ${selectedIds.length} transactions to nominal account ${targetNominal}.` 
      });
      setSelectedIds([]);
    },
    onError: (err: any) => {
      toast({ title: "Reclassification Failed", description: err.message, variant: "destructive" });
    }
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async () => {
      const salesIds = filteredTransactions
        .filter(t => selectedIds.includes(t.id) && t.type === "Sales")
        .map(t => t.id);

      const purchaseIds = filteredTransactions
        .filter(t => selectedIds.includes(t.id) && t.type === "Purchase")
        .map(t => t.id - 10000);

      let totalDeleted = 0;

      if (salesIds.length > 0) {
        const res = await apiRequest("POST", "/api/bookkeeping/bulk-delete", {
          clientId: parseInt(clientId),
          entityType: "Sales",
          ids: salesIds,
        });
        if (!res.ok) throw new Error("Failed to delete sales invoices");
        const d = await res.json();
        totalDeleted += d.deletedCount;
      }

      if (purchaseIds.length > 0) {
        const res = await apiRequest("POST", "/api/bookkeeping/bulk-delete", {
          clientId: parseInt(clientId),
          entityType: "Purchases",
          ids: purchaseIds,
        });
        if (!res.ok) throw new Error("Failed to delete purchase bills");
        const d = await res.json();
        totalDeleted += d.deletedCount;
      }

      return { totalDeleted };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [`/api/bookkeeping/invoices/client/${clientId || 1}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/bookkeeping/purchases/client/${clientId || 1}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/bookkeeping/client/${clientId}/dashboard-analytics`] });
      setSelectedIds([]);
      toast({
        title: "Bulk Purge Complete",
        description: `Successfully deleted ${data.totalDeleted} records from general ledger.`,
      });
    },
    onError: (err: any) => {
      toast({ title: "Delete Failed", description: err.message, variant: "destructive" });
    },
  });

  const handleBulkReclassify = () => {
    if (selectedIds.length === 0) {
      toast({ title: "Selection Error", description: "Select at least one transaction to reclassify.", variant: "destructive" });
      return;
    }
    bulkReclassifyMutation.mutate();
  };

  return (
    <AppLayout sidebar={clientId ? getClientSidebar(clientId) : bookkeepingSidebar} module="Bookkeeping">
      <div className="bg-gray-50 min-h-screen">
        {/* Navigation Breadcrumb */}
        <div className="bg-white px-4 py-2.5 border-b border-gray-200 flex items-center text-sm text-gray-500 gap-2">
          <button onClick={() => navigate("/bookkeeping")} className="hover:text-purple-600 font-medium transition-colors">Bookkeeping</button>
          <ChevronRight size={14} />
          <span className="font-semibold text-gray-800">Bulk Maintenance</span>
        </div>

        <div className="p-6 max-w-[1600px] mx-auto space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {activeMode === "reclassify" ? "Bulk Reclassify Transactions" : "Bulk Delete Transactions"}
              </h1>
              <p className="text-xs text-gray-500 mt-0.5">
                {activeMode === "reclassify" 
                  ? "Mass-modify nominal codes and reassign transactions across the general ledger." 
                  : "Purge imported or mistaken transactions in bulk with double-entry ledger cleanup (Capium Article 9000172241)."}
              </p>
            </div>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex border-b border-gray-200 gap-6">
            <button
              onClick={() => { setActiveMode("reclassify"); setSelectedIds([]); }}
              className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
                activeMode === "reclassify" ? "border-purple-600 text-purple-700" : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <RefreshCw size={15} /> Bulk Reclassify Nominal Codes
            </button>
            <button
              onClick={() => { setActiveMode("delete"); setSelectedIds([]); }}
              className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
                activeMode === "delete" ? "border-red-600 text-red-600" : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <Trash2 size={15} /> Bulk Delete Transactions (Capium Parity)
            </button>
          </div>

          {/* Search & Filter Bar */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 flex flex-col md:flex-row items-center gap-4">
            <div className="flex-1 w-full">
              <label className="block text-xs font-bold text-gray-700 mb-1">Search Transactions</label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 text-gray-400" size={14} />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search description, reference, or supplier..."
                  className="pl-9 pr-4 py-2 w-full border border-gray-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            <div className="w-full md:w-48">
              <label className="block text-xs font-bold text-gray-700 mb-1">Transaction Type</label>
              <select
                value={typeFilter}
                onChange={(e: any) => setTypeFilter(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-purple-500 font-medium"
              >
                <option value="all">All Transactions</option>
                <option value="Sales">Sales Invoices</option>
                <option value="Purchase">Purchase Bills</option>
              </select>
            </div>
          </div>

          {/* Table Container */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 bg-gray-50 border-b border-gray-200 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="text-xs font-bold text-gray-700 flex items-center gap-2">
                <CheckSquare size={16} className="text-purple-600" />
                <span>{selectedIds.length} of {filteredTransactions.length} items selected</span>
              </div>

              <div className="flex items-center gap-3 w-full md:w-auto">
                {activeMode === "reclassify" ? (
                  <>
                    <select
                      value={targetNominal}
                      onChange={(e) => setTargetNominal(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-purple-500 font-medium bg-white"
                    >
                      <option value="7500 - Printing & Stationery">7500 - Printing & Stationery</option>
                      <option value="7506 - IT & Software">7506 - IT & Software</option>
                      <option value="7400 - Travel & Entertainment">7400 - Travel & Entertainment</option>
                      <option value="5000 - Cost of Goods Sold">5000 - Cost of Goods Sold</option>
                      <option value="4000 - General Sales">4000 - General Sales</option>
                    </select>

                    <button
                      onClick={handleBulkReclassify}
                      disabled={selectedIds.length === 0 || bulkReclassifyMutation.isPending}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold shadow-sm flex items-center gap-1.5 transition-colors disabled:opacity-50"
                    >
                      <RefreshCw size={14} className={bulkReclassifyMutation.isPending ? "animate-spin" : ""} />
                      {bulkReclassifyMutation.isPending ? "Reclassifying..." : "Apply Bulk Reclassify"}
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => {
                      if (selectedIds.length === 0) {
                        toast({ title: "No Selection", description: "Please select at least one record to delete.", variant: "destructive" });
                        return;
                      }
                      if (window.confirm(`Are you sure you want to permanently delete ${selectedIds.length} selected transaction(s)? This will also clean up associated ledger entries.`)) {
                        bulkDeleteMutation.mutate();
                      }
                    }}
                    disabled={selectedIds.length === 0 || bulkDeleteMutation.isPending}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold shadow-sm flex items-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    <Trash2 size={14} className={bulkDeleteMutation.isPending ? "animate-spin" : ""} />
                    {bulkDeleteMutation.isPending ? "Purging Records..." : `Purge Selected (${selectedIds.length})`}
                  </button>
                )}
              </div>
            </div>

            {isLoadingInv || isLoadingPur ? (
              <div className="p-12 text-center text-xs text-gray-500">
                Loading client transactions from general ledger...
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Layers size={24} />
                </div>
                <h3 className="text-sm font-semibold text-gray-800 mb-1">No Transactions Found</h3>
                <p className="text-xs text-gray-500 max-w-sm mx-auto mb-4">
                  There are no sales invoices or purchase bills matching your search or filters to reclassify.
                </p>
                <div className="flex justify-center gap-2">
                  <button
                    onClick={() => navigate(`/bookkeeping/${clientId}/invoices/new`)}
                    className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-medium"
                  >
                    + New Sales Invoice
                  </button>
                  <button
                    onClick={() => navigate(`/bookkeeping/${clientId}/purchases/new`)}
                    className="px-3 py-1.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg text-xs font-medium"
                  >
                    + New Purchase Bill
                  </button>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-100 border-b border-gray-200 text-gray-700 font-semibold uppercase">
                    <tr>
                      <th className="px-4 py-3 w-12 text-center">
                        <input
                          type="checkbox"
                          checked={selectedIds.length > 0 && selectedIds.length === filteredTransactions.length}
                          onChange={toggleSelectAll}
                          className="rounded text-purple-600 w-4 h-4 cursor-pointer"
                        />
                      </th>
                      <th className="px-6 py-3">Reference</th>
                      <th className="px-6 py-3">Date</th>
                      <th className="px-6 py-3">Description</th>
                      <th className="px-6 py-3">Type</th>
                      <th className="px-6 py-3">Amount</th>
                      <th className="px-6 py-3">Current Nominal Code</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredTransactions.map(t => (
                      <tr key={t.id} className="hover:bg-gray-50/80 transition-colors">
                        <td className="px-4 py-3 text-center">
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(t.id)}
                            onChange={() => toggleSelect(t.id)}
                            className="rounded text-purple-600 w-4 h-4 cursor-pointer"
                          />
                        </td>
                        <td className="px-6 py-3 font-mono font-medium text-purple-700">{t.refNo}</td>
                        <td className="px-6 py-3 text-gray-600">{t.date}</td>
                        <td className="px-6 py-3 font-bold text-gray-900">{t.description}</td>
                        <td className="px-6 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                            t.type === 'Sales' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                          }`}>
                            {t.type}
                          </span>
                        </td>
                        <td className="px-6 py-3 font-bold text-gray-900">£{t.amount.toFixed(2)}</td>
                        <td className="px-6 py-3 text-gray-700 font-mono">{t.nominalCode}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
