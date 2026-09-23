import { useState, useRef } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import AppLayout from "../../components/layout/AppLayout";
import { apiRequest, queryClient } from "../../lib/queryClient";
import { useToast } from "../../hooks/useToast";
import {
  Plus, X, Save, Edit, Trash2, Package, Upload, Download,
  Search, FileSpreadsheet, CheckCircle2, AlertCircle, RefreshCw,
  Info, History, Check, ArrowRight
} from "lucide-react";
import { bookkeepingSidebar, getClientSidebar } from "./sidebar";
import ClientGuard from "./ClientGuard";

export default function ItemsPage() {
  const [match, params] = useRoute("/bookkeeping/:id/items");
  const clientId = match ? params.id : "";
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importTab, setImportTab] = useState<"import" | "history">("import");
  const [editingItem, setEditingItem] = useState<any | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    itemCode: "",
    description: "",
    type: "Product",
    salesPrice: "0.00",
    salesVatRate: "20.00",
    salesNominalCode: "4000",
    purchasePrice: "0.00",
    purchaseVatRate: "20.00",
    purchaseNominalCode: "5000",
    openingBalanceQuantity: "0",
    openingBalancePrice: "0.00",
    isActive: true,
  });

  // CSV Import State
  const [parsedImportItems, setParsedImportItems] = useState<any[]>([]);
  const [importFileName, setImportFileName] = useState("");
  const [isParsingCsv, setIsParsingCsv] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Import History (persisted in client storage)
  const [importHistory, setImportHistory] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem(`sansuite_item_imports_${clientId}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["/api/practice/clients"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/practice/clients");
      return res.json();
    },
  });
  const client = clients.find((c: any) => String(c.id) === clientId);

  const { data: items = [], isLoading, refetch } = useQuery({
    queryKey: [`/api/bookkeeping/items/client`, clientId],
    queryFn: async () => {
      const url = clientId ? `/api/bookkeeping/items/client/${clientId}` : "/api/bookkeeping/items";
      const res = await apiRequest("GET", url);
      return res.ok ? res.json() : [];
    },
    enabled: !!clientId,
  });

  const addItem = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/bookkeeping/items", { ...formData, clientId });
      if (!res.ok) throw new Error("Failed to add item");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/bookkeeping/items/client`, clientId] });
      queryClient.invalidateQueries({ queryKey: ["/api/bookkeeping/items"] });
      toast({ title: "Item Added", description: "Successfully added new item with initial opening stock." });
      setShowModal(false);
      resetForm();
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" })
  });

  const updateItem = useMutation({
    mutationFn: async () => {
      if (!editingItem) return;
      const res = await apiRequest("PUT", `/api/bookkeeping/items/${editingItem.id}`, formData);
      if (!res.ok) throw new Error("Failed to update item");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/bookkeeping/items/client`, clientId] });
      queryClient.invalidateQueries({ queryKey: ["/api/bookkeeping/items"] });
      toast({ title: "Item Updated", description: "Item details updated successfully." });
      setShowModal(false);
      resetForm();
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" })
  });

  const deleteItem = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/bookkeeping/items/${id}`);
      if (!res.ok) throw new Error("Failed to delete item");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/bookkeeping/items/client`, clientId] });
      queryClient.invalidateQueries({ queryKey: ["/api/bookkeeping/items"] });
      toast({ title: "Item Deleted", description: "Item has been removed." });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" })
  });

  const importItemsMutation = useMutation({
    mutationFn: async () => {
      if (!parsedImportItems.length) throw new Error("No items parsed for import.");
      const res = await apiRequest("POST", `/api/bookkeeping/items/import/${clientId}`, {
        items: parsedImportItems
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to batch import items.");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [`/api/bookkeeping/items/client`, clientId] });
      queryClient.invalidateQueries({ queryKey: ["/api/bookkeeping/items"] });
      toast({
        title: "Import Completed",
        description: data.message || `Successfully imported ${data.importedCount} items.`,
      });

      // Update history
      const newEntry = {
        id: Date.now(),
        fileName: importFileName || "items_import.csv",
        importedCount: data.importedCount,
        skippedCount: data.skippedCount,
        importedAt: new Date().toLocaleString(),
      };
      const updatedHistory = [newEntry, ...importHistory];
      setImportHistory(updatedHistory);
      try {
        localStorage.setItem(`sansuite_item_imports_${clientId}`, JSON.stringify(updatedHistory));
      } catch {}

      // Reset import state
      setParsedImportItems([]);
      setImportFileName("");
      setShowImportModal(false);
    },
    onError: (err: any) => {
      toast({ title: "Import Failed", description: err.message, variant: "destructive" });
    }
  });

  const resetForm = () => {
    setEditingItem(null);
    setFormData({
      name: "",
      itemCode: "",
      description: "",
      type: "Product",
      salesPrice: "0.00",
      salesVatRate: "20.00",
      salesNominalCode: "4000",
      purchasePrice: "0.00",
      purchaseVatRate: "20.00",
      purchaseNominalCode: "5000",
      openingBalanceQuantity: "0",
      openingBalancePrice: "0.00",
      isActive: true,
    });
  };

  const handleEdit = (item: any) => {
    const editUrl = clientId ? `/bookkeeping/${clientId}/items/${item.id}/edit` : `/bookkeeping/items/${item.id}/edit`;
    navigate(editUrl);
  };

  const handleCreateNew = () => {
    const newUrl = clientId ? `/bookkeeping/${clientId}/items/new` : `/bookkeeping/items/new`;
    navigate(newUrl);
  };

  const handleDelete = (item: any) => {
    if (confirm(`Are you sure you want to delete "${item.name}"?`)) {
      deleteItem.mutate(item.id);
    }
  };

  // CSV Template Generator
  const downloadSampleTemplate = () => {
    const headers = ["Item Name", "Item Code", "Item Price", "Description", "OpeningBalance Quantity", "OpeningBalance Price"];
    const rows = [
      ["Standard Consulting Hour", "SRV-CONSULT", "150.00", "Hourly advisory fee", "0", "0.00"],
      ["Dell Pro Monitor 27inch", "PRD-MNTR27", "240.00", "Hardware display unit", "25", "180.00"],
    ];
    const csvContent = [headers.join(","), ...rows.map(r => r.map(c => `"${c.replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `SanSuite_Items_Template_${client?.clientName?.replace(/\s+/g, "_") || "Client"}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export Items to CSV
  const exportItemsToCsv = () => {
    if (!items.length) {
      toast({ title: "No Items", description: "There are no items to export.", variant: "destructive" });
      return;
    }
    const headers = ["Item Name", "Item Code", "Type", "Sales Price", "Purchase Price", "Opening Qty", "Opening Price", "Total Opening Value", "Status"];
    const rows = items.map((i: any) => [
      i.name || "",
      i.itemCode || "",
      i.type || "Product",
      parseFloat(i.salesPrice || 0).toFixed(2),
      parseFloat(i.purchasePrice || 0).toFixed(2),
      parseFloat(i.openingBalanceQuantity || 0).toFixed(2),
      parseFloat(i.openingBalancePrice || 0).toFixed(2),
      (parseFloat(i.openingBalanceQuantity || 0) * parseFloat(i.openingBalancePrice || 0)).toFixed(2),
      i.isActive ? "Active" : "Inactive"
    ]);
    const csvContent = [headers.join(","), ...rows.map((r: any[]) => r.map((c: any) => `"${String(c).replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Items_Export_${client?.clientName?.replace(/\s+/g, "_") || "Client"}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handle CSV File Upload & Parsing
  const handleCsvFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImportFileName(file.name);
    setIsParsingCsv(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text) {
        setIsParsingCsv(false);
        return;
      }

      const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
      if (lines.length < 2) {
        toast({ title: "Empty CSV", description: "CSV file must contain a header row and at least one data row.", variant: "destructive" });
        setIsParsingCsv(false);
        return;
      }

      // Detect header index mapping
      const headerLine = lines[0].toLowerCase();
      const headers = headerLine.split(",").map(h => h.trim().replace(/^["']|["']$/g, ""));

      const nameIdx = headers.findIndex(h => h.includes("item name") || h.includes("name"));
      const codeIdx = headers.findIndex(h => h.includes("item code") || h.includes("code") || h.includes("sku"));
      const priceIdx = headers.findIndex(h => h.includes("item price") || h.includes("sales price") || h.includes("price"));
      const descIdx = headers.findIndex(h => h.includes("description") || h.includes("desc"));
      const openQtyIdx = headers.findIndex(h => h.includes("openingbalance quantity") || h.includes("opening qty") || h.includes("opening quantity") || h.includes("quantity"));
      const openPriceIdx = headers.findIndex(h => h.includes("openingbalance price") || h.includes("opening price") || h.includes("unit cost"));

      const parsed: any[] = [];
      for (let i = 1; i < lines.length; i++) {
        // Regex to handle quoted CSV fields
        const cols = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || lines[i].split(",");
        const cleanCols = cols.map(c => c.trim().replace(/^["']|["']$/g, ""));

        const name = (nameIdx !== -1 ? cleanCols[nameIdx] : cleanCols[0]) || "";
        if (!name.trim()) continue;

        const code = (codeIdx !== -1 ? cleanCols[codeIdx] : cleanCols[1]) || "";
        const price = (priceIdx !== -1 ? cleanCols[priceIdx] : cleanCols[2]) || "0.00";
        const desc = (descIdx !== -1 ? cleanCols[descIdx] : cleanCols[3]) || "";
        const openQty = (openQtyIdx !== -1 ? cleanCols[openQtyIdx] : cleanCols[4]) || "0";
        const openPrice = (openPriceIdx !== -1 ? cleanCols[openPriceIdx] : cleanCols[5]) || "0.00";

        parsed.push({
          name: name.trim(),
          itemCode: code.trim(),
          salesPrice: parseFloat(price.replace(/[^0-9.]/g, "")) || 0,
          description: desc.trim(),
          openingBalanceQuantity: parseFloat(openQty.replace(/[^0-9.]/g, "")) || 0,
          openingBalancePrice: parseFloat(openPrice.replace(/[^0-9.]/g, "")) || 0,
        });
      }

      setParsedImportItems(parsed);
      setIsParsingCsv(false);
      if (parsed.length > 0) {
        toast({ title: "CSV Parsed", description: `Found ${parsed.length} valid item rows ready to import.` });
      } else {
        toast({ title: "No Items Parsed", description: "Check that your CSV headers match the template.", variant: "destructive" });
      }
    };
    reader.readAsText(file);
  };

  const filteredItems = items.filter((i: any) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      i.name?.toLowerCase().includes(q) ||
      i.itemCode?.toLowerCase().includes(q) ||
      i.type?.toLowerCase().includes(q) ||
      i.description?.toLowerCase().includes(q)
    );
  });

  if (!clientId) {
    return <ClientGuard featureTitle="Items Catalog" />;
  }

  return (
    <AppLayout sidebar={clientId ? getClientSidebar(clientId) : bookkeepingSidebar} module="Bookkeeping">
      <div className="bg-slate-50/50 min-h-screen">
        {/* Sub-Header Navigation & Action Bar */}
        <div className="bg-white px-6 py-3 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center text-xs text-slate-500 gap-2">
            <button onClick={() => navigate("/bookkeeping")} className="hover:text-purple-600 font-medium">Bookkeeping</button>
            <span>/</span>
            <span className="font-semibold text-slate-700">{client?.clientName || "Client"}</span>
            <span>/</span>
            <span className="text-purple-700 font-semibold">Sales Items & Inventory</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setShowImportModal(true)}
              className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-2xs cursor-pointer transition-colors"
            >
              <Upload size={14} className="text-purple-600" /> Import
            </button>
            <button
              onClick={exportItemsToCsv}
              className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-2xs cursor-pointer transition-colors"
            >
              <Download size={14} className="text-slate-500" /> Export
            </button>
            <button
              onClick={handleCreateNew}
              className="bg-purple-600 hover:bg-purple-700 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
            >
              <Plus size={14} /> New Item
            </button>
          </div>
        </div>

        {/* Content Container */}
        <div className="p-6 max-w-7xl mx-auto space-y-5">
          {/* Header Card with Search */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                <Package size={20} />
              </div>
              <div>
                <h1 className="text-base font-bold text-slate-800">Items & Products Catalog</h1>
                <p className="text-xs text-slate-500">Manage catalog goods, service rates, and initial opening stock.</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative w-64">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search item name or code..."
                  className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:border-purple-600 bg-slate-50/50"
                />
              </div>
              <button
                onClick={() => refetch()}
                className="p-1.5 border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-100 cursor-pointer"
                title="Refresh Items"
              >
                <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
              </button>
            </div>
          </div>

          {/* Items Data Table */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 text-slate-600 border-b border-slate-200 uppercase font-semibold tracking-wider text-[11px]">
                  <th className="px-5 py-3">Item Name</th>
                  <th className="px-5 py-3">Code / SKU</th>
                  <th className="px-5 py-3 text-right">Price (£)</th>
                  <th className="px-5 py-3 text-right">Opening Stock</th>
                  <th className="px-5 py-3 text-center">Status</th>
                  <th className="px-5 py-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-slate-400">
                      <RefreshCw size={20} className="animate-spin mx-auto mb-2 text-purple-600" />
                      Loading catalog items...
                    </td>
                  </tr>
                ) : filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-slate-500">
                      <Package className="mx-auto mb-2 opacity-40 text-purple-500" size={32} />
                      <p className="font-medium text-slate-700">No items to display</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">Click "+ New Item" or "Import" to load items from CSV.</p>
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item: any) => {
                    const openQty = parseFloat(item.openingBalanceQuantity || 0);
                    const openPrice = parseFloat(item.openingBalancePrice || 0);
                    const openTotal = (openQty * openPrice).toFixed(2);

                    return (
                      <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-5 py-3">
                          <div className="font-semibold text-slate-800">{item.name}</div>
                          {item.description && (
                            <div className="text-[11px] text-slate-400 line-clamp-1">{item.description}</div>
                          )}
                        </td>
                        <td className="px-5 py-3 font-mono font-medium text-purple-700">
                          {item.itemCode || "—"}
                        </td>
                        <td className="px-5 py-3 text-right font-mono font-bold text-slate-800">
                          £{parseFloat(item.salesPrice || 0).toFixed(2)}
                        </td>
                        <td className="px-5 py-3 text-right">
                          {openQty > 0 ? (
                            <div>
                              <span className="font-semibold text-emerald-700 font-mono">{openQty} pcs</span>
                              <span className="text-[10px] text-slate-400 block font-mono">@ £{openPrice.toFixed(2)} (£{openTotal})</span>
                            </div>
                          ) : (
                            <span className="text-slate-400 font-mono">—</span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-center">
                          {item.isActive ? (
                            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-[10px] font-medium inline-flex items-center gap-1">
                              <CheckCircle2 size={10} /> Active
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full text-[10px] font-medium">
                              Inactive
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleEdit(item)}
                              className="p-1 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded transition-colors"
                              title="Edit Item"
                            >
                              <Edit size={14} />
                            </button>
                            <button
                              onClick={() => handleDelete(item)}
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                              title="Delete Item"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
            <div className="px-5 py-3 bg-slate-50/50 border-t border-slate-200 text-xs text-slate-500 flex justify-between items-center">
              <span>Showing {filteredItems.length} of {items.length} items</span>
            </div>
          </div>
        </div>
      </div>

      {/* IMPORT ITEMS MODAL (CAPIUM PARITY SUITE) */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 !mt-0 animate-in fade-in duration-150">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/70 flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center">
                  <Upload size={16} />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-800">Import Items</h3>
                  <p className="text-[11px] text-slate-500">Upload CSV items with sales prices and opening stock</p>
                </div>
              </div>
              <button
                onClick={() => setShowImportModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/50 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="px-6 border-b border-slate-200 bg-white flex gap-6 text-xs font-semibold">
              <button
                onClick={() => setImportTab("import")}
                className={`py-3 border-b-2 transition-colors cursor-pointer ${
                  importTab === "import"
                    ? "border-purple-600 text-purple-700 font-bold"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                Import
              </button>
              <button
                onClick={() => setImportTab("history")}
                className={`py-3 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                  importTab === "history"
                    ? "border-purple-600 text-purple-700 font-bold"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                <History size={13} /> History ({importHistory.length})
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
              {importTab === "import" ? (
                <>
                  {/* 3 Step Instruction Grid (Matching Capium specification) */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Step 1 */}
                    <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 flex flex-col justify-between">
                      <div>
                        <div className="text-xs font-bold text-purple-700 mb-1">Step 1. Download Template</div>
                        <p className="text-[11px] text-slate-500 leading-relaxed">
                          Download our CSV sales item template file with prescribed headings.
                        </p>
                      </div>
                      <button
                        onClick={downloadSampleTemplate}
                        className="mt-3 w-full py-1.5 bg-white border border-purple-300 text-purple-700 hover:bg-purple-50 rounded-lg font-semibold flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer transition-colors"
                      >
                        <Download size={13} /> Download Template
                      </button>
                    </div>

                    {/* Step 2 */}
                    <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 flex flex-col justify-between">
                      <div>
                        <div className="text-xs font-bold text-purple-700 mb-1">Step 2. Fill Data in Template</div>
                        <p className="text-[11px] text-slate-500 leading-relaxed">
                          Paste your item names, prices, and opening stock into the template. Do not modify column headings.
                        </p>
                      </div>
                      <div className="mt-3 text-[10px] text-slate-400 bg-white p-2 border border-slate-200 rounded-lg">
                        Accepted format: <span className="font-mono font-semibold">.CSV</span> (Comma Separated)
                      </div>
                    </div>

                    {/* Step 3 */}
                    <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 flex flex-col justify-between">
                      <div>
                        <div className="text-xs font-bold text-purple-700 mb-1">Step 3. Choose & Import File</div>
                        <p className="text-[11px] text-slate-500 leading-relaxed">
                          Select the filled CSV from your computer to parse and preview records.
                        </p>
                      </div>
                      <div className="mt-3">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept=".csv"
                          onChange={handleCsvFileUpload}
                          className="hidden"
                        />
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="w-full py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer transition-colors"
                        >
                          <FileSpreadsheet size={13} /> {importFileName ? "Change File" : "Choose File"}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Parsed Preview Table */}
                  {parsedImportItems.length > 0 && (
                    <div className="border border-emerald-200 bg-emerald-50/30 rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-emerald-800 font-bold">
                          <CheckCircle2 size={16} className="text-emerald-600" />
                          <span>Ready to Import ({parsedImportItems.length} items parsed from {importFileName})</span>
                        </div>
                        <span className="text-[11px] text-slate-500">Duplicates will be skipped automatically</span>
                      </div>

                      <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg bg-white">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600 text-[11px]">
                            <tr>
                              <th className="px-3 py-2">Item Name</th>
                              <th className="px-3 py-2">Code</th>
                              <th className="px-3 py-2 text-right">Price</th>
                              <th className="px-3 py-2 text-right">Opening Qty</th>
                              <th className="px-3 py-2 text-right">Opening Price</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-mono">
                            {parsedImportItems.slice(0, 8).map((p, idx) => (
                              <tr key={idx} className="hover:bg-slate-50/50">
                                <td className="px-3 py-1.5 font-sans font-medium text-slate-800">{p.name}</td>
                                <td className="px-3 py-1.5 text-purple-700">{p.itemCode || "—"}</td>
                                <td className="px-3 py-1.5 text-right">£{parseFloat(p.salesPrice || 0).toFixed(2)}</td>
                                <td className="px-3 py-1.5 text-right">{p.openingBalanceQuantity || 0}</td>
                                <td className="px-3 py-1.5 text-right">£{parseFloat(p.openingBalancePrice || 0).toFixed(2)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {parsedImportItems.length > 8 && (
                          <div className="p-2 text-center text-[11px] text-slate-400 bg-slate-50 border-t border-slate-200">
                            ... and {parsedImportItems.length - 8} more items
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Available Fields Reference Table (Capium Parity) */}
                  <div className="space-y-2">
                    <h4 className="font-bold text-slate-800 flex items-center gap-1.5">
                      <Info size={14} className="text-purple-600" />
                      Available Fields Specification
                    </h4>
                    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600">
                          <tr>
                            <th className="px-4 py-2.5">Field Name</th>
                            <th className="px-4 py-2.5">Required</th>
                            <th className="px-4 py-2.5">Notes</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          <tr>
                            <td className="px-4 py-2 font-mono font-medium text-purple-700">Item Name</td>
                            <td className="px-4 py-2"><span className="text-rose-600 font-bold">YES</span></td>
                            <td className="px-4 py-2 text-slate-500">Unique name of the sales product or service</td>
                          </tr>
                          <tr>
                            <td className="px-4 py-2 font-mono font-medium text-purple-700">Item Code</td>
                            <td className="px-4 py-2"><span className="text-slate-500">NO</span></td>
                            <td className="px-4 py-2 text-slate-500">SKU or reference code. If blank, one is generated automatically</td>
                          </tr>
                          <tr>
                            <td className="px-4 py-2 font-mono font-medium text-purple-700">Item Price</td>
                            <td className="px-4 py-2"><span className="text-rose-600 font-bold">YES</span></td>
                            <td className="px-4 py-2 text-slate-500">Standard unit selling price (numeric value, e.g. 50.00)</td>
                          </tr>
                          <tr>
                            <td className="px-4 py-2 font-mono font-medium text-purple-700">Description</td>
                            <td className="px-4 py-2"><span className="text-slate-500">NO</span></td>
                            <td className="px-4 py-2 text-slate-500">Detailed item description for invoice lines</td>
                          </tr>
                          <tr>
                            <td className="px-4 py-2 font-mono font-medium text-purple-700">OpeningBalance Quantity</td>
                            <td className="px-4 py-2"><span className="text-slate-500">NO</span></td>
                            <td className="px-4 py-2 text-slate-500">Initial physical stock count on hand (default 0)</td>
                          </tr>
                          <tr>
                            <td className="px-4 py-2 font-mono font-medium text-purple-700">OpeningBalance Price</td>
                            <td className="px-4 py-2"><span className="text-slate-500">NO</span></td>
                            <td className="px-4 py-2 text-slate-500">Acquisition cost per unit for balance sheet stock valuation</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Notes Callout */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-[11px] text-slate-600 space-y-1">
                    <div className="font-bold text-slate-700 mb-1">Important Instructions:</div>
                    <p>• Follow the predefined template downloaded from Step 1 above.</p>
                    <p>• Do not change the heading sequence or heading names.</p>
                    <p>• Maximum 100 characters allowed in Item Name field.</p>
                    <p>• Already existing items from CSV will be skipped automatically during import.</p>
                  </div>
                </>
              ) : (
                /* History Tab */
                <div className="space-y-4">
                  {importHistory.length === 0 ? (
                    <div className="text-center py-12 text-slate-400">
                      <History size={32} className="mx-auto mb-2 opacity-30" />
                      <p>No item imports recorded yet for this client.</p>
                    </div>
                  ) : (
                    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600">
                          <tr>
                            <th className="px-4 py-2.5">File Name</th>
                            <th className="px-4 py-2.5 text-center">Imported Records</th>
                            <th className="px-4 py-2.5 text-center">Skipped</th>
                            <th className="px-4 py-2.5">Imported On</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {importHistory.map((h) => (
                            <tr key={h.id}>
                              <td className="px-4 py-2.5 font-medium text-slate-800">{h.fileName}</td>
                              <td className="px-4 py-2.5 text-center font-mono text-emerald-700 font-bold">{h.importedCount}</td>
                              <td className="px-4 py-2.5 text-center font-mono text-slate-400">{h.skippedCount}</td>
                              <td className="px-4 py-2.5 text-slate-500">{h.importedAt}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50/70 flex justify-between items-center">
              <button
                onClick={() => setShowImportModal(false)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-100 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              {importTab === "import" && (
                <button
                  onClick={() => importItemsMutation.mutate()}
                  disabled={importItemsMutation.isPending || parsedImportItems.length === 0}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs disabled:opacity-50 cursor-pointer transition-colors"
                >
                  <Upload size={14} />
                  {importItemsMutation.isPending
                    ? "Importing Items..."
                    : `Import ${parsedImportItems.length} Items`}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
