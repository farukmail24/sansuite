import React, { useState, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AppLayout from "@/components/layout/AppLayout";
import { getClientSidebar } from "../sidebar";
import { 
  Plus, Search, ShoppingCart, Trash2, Pencil, ChevronRight, Upload, 
  Download, FileSpreadsheet, CheckCircle2, AlertCircle, X, HelpCircle, 
  History, ArrowRight, RefreshCw, FileText, Check
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/useToast";
import CreditNotesManager from "../common/CreditNotesManager";

interface ParsedPurchaseRow {
  supplierName: string;
  purchaseType: string;
  billNumber: string;
  billDate: string;
  dueDate: string;
  description: string;
  quantity: string;
  unitPrice: string;
  vatRate: string;
  accountCode: string;
  notes: string;
}

export default function PurchasesList() {
  const { id: clientId } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSubTab, setActiveSubTab] = useState<"bills" | "creditNotes">("bills");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Import modal states
  const [showImportModal, setShowImportModal] = useState(false);
  const [importTab, setImportTab] = useState<"import" | "history">("import");
  const [importStep, setImportStep] = useState<1 | 2 | 3>(1);
  const [parsedRows, setParsedRows] = useState<ParsedPurchaseRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [parseError, setParseError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: contactsList = [] } = useQuery({
    queryKey: [`/api/bookkeeping/contacts/client/${clientId}`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/bookkeeping/contacts/client/${clientId}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!clientId,
  });

  const { data: purchases = [], isLoading } = useQuery({
    queryKey: [`/api/bookkeeping/purchases/client/${clientId}`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/bookkeeping/purchases/client/${clientId}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!clientId,
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["/api/practice/clients"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/practice/clients");
      if (!res.ok) return [];
      return res.json();
    },
  });

  const client = clients.find((c: any) => String(c.id) === clientId);

  const deletePurchaseMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/bookkeeping/purchases/${id}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to delete purchase bill");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/bookkeeping/purchases/client/${clientId}`] });
      toast({ title: "Bill Deleted", description: "The purchase bill has been deleted successfully." });
    },
    onError: (err: any) => {
      toast({ title: "Delete Failed", description: err.message || "Could not delete purchase bill.", variant: "destructive" });
    },
  });

  const importPurchasesMutation = useMutation({
    mutationFn: async (purchasesToImport: ParsedPurchaseRow[]) => {
      const res = await apiRequest("POST", `/api/bookkeeping/purchases/import/${clientId}`, {
        purchases: purchasesToImport,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to import purchase bills");
      }
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: [`/api/bookkeeping/purchases/client/${clientId}`] });
      toast({
        title: "Import Completed",
        description: data.message || `Successfully imported ${data.importedPurchases} purchase bills.`,
      });
      setShowImportModal(false);
      setParsedRows([]);
      setFileName("");
      setImportStep(1);
    },
    onError: (err: any) => {
      toast({
        title: "Import Failed",
        description: err.message || "An error occurred during import.",
        variant: "destructive",
      });
    },
  });

  // Download Sample Template
  const handleDownloadSampleTemplate = () => {
    const headers = [
      "Supplier Name",
      "Purchase Type",
      "Bill Number",
      "Bill Date",
      "Due Date",
      "Description",
      "Quantity",
      "Unit Price",
      "VAT Rate (%)",
      "Account Code",
      "Notes"
    ];

    const sampleRows = [
      ["Office Supplies UK Ltd", "Invoice", "BILL-2026-001", "15/01/2026", "14/02/2026", "A4 Printing Paper & Stationery", "5", "12.50", "20.00", "5000", "Monthly office stationery bundle"],
      ["Office Supplies UK Ltd", "Invoice", "BILL-2026-001", "15/01/2026", "14/02/2026", "Printer Toner Cartridges (Black)", "2", "45.00", "20.00", "5000", "Consumables"],
      ["Apex Telecommunications", "Invoice", "BILL-2026-002", "01/02/2026", "01/03/2026", "Business Broadband & VoIP Lines", "1", "85.00", "20.00", "7500", "Monthly telecommunications billing"],
      ["City Utilities Board", "Invoice", "BILL-2026-003", "10/02/2026", "10/03/2026", "Electricity & Gas Utility Bill", "1", "142.50", "5.00", "7200", "Quarterly energy bill"]
    ];

    const csvContent = [
      headers.join(","),
      ...sampleRows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "Sample_Purchase_Invoices_Template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export Purchases
  const handleExportCSV = () => {
    if (filteredPurchases.length === 0) {
      toast({ title: "No Purchases", description: "No purchase records available to export." });
      return;
    }

    const headers = ["Bill Number", "Bill Date", "Due Date", "Purchase Type", "Net Amount", "VAT Total", "Grand Total", "Status", "Notes"];
    const rows = filteredPurchases.map((p: any) => [
      p.billNumber || "",
      p.billDate ? new Date(p.billDate).toLocaleDateString("en-GB") : "",
      p.dueDate ? new Date(p.dueDate).toLocaleDateString("en-GB") : "",
      p.purchaseType || "Invoice",
      parseFloat(p.subTotal || 0).toFixed(2),
      parseFloat(p.vatTotal || 0).toFixed(2),
      parseFloat(p.grandTotal || 0).toFixed(2),
      p.status || "Unpaid",
      p.notes || ""
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((r: any[]) => r.map((c: any) => `"${String(c).replace(/"/g, '""')}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Purchases_Export_${client?.clientName?.replace(/\s+/g, "_") || "Client"}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Parse Uploaded CSV
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setParseError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setIsProcessing(true);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const text = evt.target?.result as string;
        const lines = text.split(/\r\n|\n/).filter(l => l.trim().length > 0);
        if (lines.length < 2) {
          throw new Error("CSV file is empty or missing data rows.");
        }

        const parseLine = (line: string): string[] => {
          const result: string[] = [];
          let current = "";
          let inQuotes = false;
          for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
              if (inQuotes && line[i + 1] === '"') {
                current += '"';
                i++;
              } else {
                inQuotes = !inQuotes;
              }
            } else if (char === ',' && !inQuotes) {
              result.push(current.trim());
              current = "";
            } else {
              current += char;
            }
          }
          result.push(current.trim());
          return result;
        };

        const headers = parseLine(lines[0]).map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ""));
        const rows: ParsedPurchaseRow[] = [];

        for (let i = 1; i < lines.length; i++) {
          const cols = parseLine(lines[i]);
          if (cols.length === 0 || cols.every(c => !c)) continue;

          const rowData: Record<string, string> = {};
          headers.forEach((h, idx) => {
            rowData[h] = cols[idx] || "";
          });

          const supplierName = rowData["suppliername"] || rowData["supplier"] || rowData["contactname"] || "Supplier";
          const purchaseType = rowData["purchasetype"] || rowData["type"] || "Invoice";
          const billNumber = rowData["billnumber"] || rowData["invoicenumber"] || rowData["billno"] || rowData["referenceno"] || rowData["reference"] || `BILL-${Date.now()}-${i}`;
          const billDate = rowData["billdate"] || rowData["invoicedate"] || rowData["date"] || new Date().toISOString().split("T")[0];
          const dueDate = rowData["duedate"] || rowData["invoiceduedate"] || "";
          const description = rowData["description"] || rowData["itemname"] || `Line item ${i}`;
          const quantity = rowData["quantity"] || rowData["qty"] || "1";
          const unitPrice = rowData["unitprice"] || rowData["price"] || rowData["cost"] || rowData["amount"] || "0.00";
          const vatRate = rowData["vatrate"] || rowData["vatrate%"] || "20.00";
          const accountCode = rowData["accountcode"] || rowData["nominalcode"] || "5000";
          const notes = rowData["notes"] || rowData["memo"] || "";

          rows.push({
            supplierName,
            purchaseType,
            billNumber,
            billDate,
            dueDate,
            description,
            quantity,
            unitPrice,
            vatRate,
            accountCode,
            notes
          });
        }

        if (rows.length === 0) {
          throw new Error("Could not extract any valid purchase records from the file.");
        }

        setParsedRows(rows);
        setImportStep(3);
      } catch (err: any) {
        setParseError(err.message || "Failed to parse CSV file.");
      } finally {
        setIsProcessing(false);
      }
    };

    reader.onerror = () => {
      setParseError("Failed to read the uploaded file.");
      setIsProcessing(false);
    };

    reader.readAsText(file);
  };

  const filteredPurchases = purchases.filter((pur: any) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      pur.billNumber?.toLowerCase().includes(q) ||
      pur.status?.toLowerCase().includes(q) ||
      pur.grandTotal?.toString().includes(q)
    );
  });

  // Calculate unique bill count from parsed preview
  const uniqueBillsCount = new Set(parsedRows.map(r => r.billNumber)).size;

  return (
    <AppLayout sidebar={getClientSidebar(clientId || "")} module="Bookkeeping">
      <div className="bg-gray-50 min-h-screen pb-12">
        <div className="bg-white px-4 py-2 flex items-center justify-between border-b border-gray-200">
          <div className="flex items-center text-sm text-gray-500">
            <button onClick={() => navigate("/bookkeeping")} className="hover:text-purple-600 transition-colors">Bookkeeping</button>
            <ChevronRight size={14} className="mx-1" />
            <button onClick={() => navigate(`/bookkeeping/${clientId}`)} className="hover:text-purple-600 transition-colors">{client?.clientName || 'Client'}</button>
            <ChevronRight size={14} className="mx-1" />
            <span className="text-gray-800 font-medium">Purchases (Bills)</span>
          </div>
        </div>

        <div className="p-6 w-full mx-auto">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-semibold text-gray-800">Purchases & Bills</h1>
              <p className="text-gray-500 text-sm mt-1">Manage supplier bills, expenses, and track accounts payable.</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setShowImportModal(true);
                  setImportTab("import");
                  setImportStep(1);
                  setParsedRows([]);
                  setParseError(null);
                  setFileName("");
                }}
                className="px-3.5 py-2 border border-purple-200 bg-purple-50/50 hover:bg-purple-100/70 text-purple-700 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 cursor-pointer shadow-sm"
              >
                <Upload size={15} />
                <span>Import</span>
              </button>
              <button
                onClick={handleExportCSV}
                className="px-3.5 py-2 border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 cursor-pointer shadow-sm"
              >
                <Download size={15} />
                <span>Export</span>
              </button>
              <button
                onClick={() => navigate(`/bookkeeping/${clientId}/purchases/new`)}
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm transition-colors flex items-center gap-2 text-sm cursor-pointer"
              >
                <Plus size={16} /> New Bill
              </button>
            </div>
          </div>

          {/* Subtabs: Bills vs Credit Notes */}
          <div className="flex border-b border-gray-200 mb-6 gap-6">
            <button
              onClick={() => setActiveSubTab("bills")}
              className={`pb-3 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
                activeSubTab === "bills"
                  ? "border-purple-600 text-purple-700 font-bold"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              Purchases & Bills ({purchases.length})
            </button>
            <button
              onClick={() => setActiveSubTab("creditNotes")}
              className={`pb-3 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
                activeSubTab === "creditNotes"
                  ? "border-purple-600 text-purple-700 font-bold"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              Credit Notes / Debit Notes
            </button>
          </div>

          {activeSubTab === "creditNotes" ? (
            <CreditNotesManager clientId={clientId || ""} type="Purchase" contacts={contactsList} />
          ) : (
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
              <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <div className="relative w-72">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search bills..."
                  className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 bg-white"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-xs font-semibold text-gray-500 border-b border-gray-200">
                    <th className="px-5 py-3 uppercase tracking-wider">Bill No.</th>
                    <th className="px-5 py-3 uppercase tracking-wider">Date</th>
                    <th className="px-5 py-3 uppercase tracking-wider">Due Date</th>
                    <th className="px-5 py-3 uppercase tracking-wider text-right">Net Amount</th>
                    <th className="px-5 py-3 uppercase tracking-wider text-right">VAT</th>
                    <th className="px-5 py-3 uppercase tracking-wider text-right">Total</th>
                    <th className="px-5 py-3 uppercase tracking-wider text-center">Status</th>
                    <th className="px-5 py-3 uppercase tracking-wider text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {isLoading ? (
                    <tr><td colSpan={8} className="text-center py-8 text-gray-500">Loading bills...</td></tr>
                  ) : filteredPurchases.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-12">
                        <div className="flex flex-col items-center">
                          <div className="w-16 h-16 bg-purple-50 rounded-full flex items-center justify-center text-purple-400 mb-4">
                            <ShoppingCart size={24} />
                          </div>
                          <p className="text-gray-600 font-medium">No purchase bills found.</p>
                          <p className="text-gray-400 text-sm mt-1 mb-4">Create your first supplier bill or import from CSV.</p>
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => {
                                setShowImportModal(true);
                                setImportTab("import");
                                setImportStep(1);
                              }}
                              className="px-3 py-1.5 border border-purple-200 text-purple-700 bg-purple-50 rounded-lg font-medium text-sm flex items-center gap-1.5 hover:bg-purple-100 transition-colors"
                            >
                              <Upload size={14} /> Import Bills
                            </button>
                            <button
                              onClick={() => navigate(`/bookkeeping/${clientId}/purchases/new`)}
                              className="text-purple-600 hover:text-purple-800 font-medium text-sm flex items-center gap-1"
                            >
                              <Plus size={14} /> Create Bill
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredPurchases.map((pur: any) => (
                      <tr key={pur.id} className="border-b border-gray-100 hover:bg-purple-50/20">
                        <td className="px-5 py-4 font-medium text-purple-600">{pur.billNumber}</td>
                        <td className="px-5 py-4 text-gray-600">{new Date(pur.billDate).toLocaleDateString("en-GB")}</td>
                        <td className="px-5 py-4 text-gray-600">{pur.dueDate ? new Date(pur.dueDate).toLocaleDateString("en-GB") : '-'}</td>
                        <td className="px-5 py-4 text-right text-gray-600">£{parseFloat(pur.subTotal || "0").toFixed(2)}</td>
                        <td className="px-5 py-4 text-right text-gray-600">£{parseFloat(pur.vatTotal || "0").toFixed(2)}</td>
                        <td className="px-5 py-4 text-right font-medium text-gray-800">£{parseFloat(pur.grandTotal || "0").toFixed(2)}</td>
                        <td className="px-5 py-4 text-center">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${pur.status === 'Paid' ? 'bg-green-100 text-green-700 border-green-200' :
                            pur.status === 'Overdue' ? 'bg-red-100 text-red-700 border-red-200' :
                              'bg-yellow-100 text-yellow-700 border-yellow-200'
                            }`}>
                            {pur.status || "Unpaid"}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => navigate(`/bookkeeping/${clientId}/purchases/new`)}
                              className="p-1.5 text-slate-500 hover:text-purple-600 hover:bg-purple-50 rounded transition-colors cursor-pointer"
                              title="Edit Bill"
                            >
                              <Pencil size={15} />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm(`Are you sure you want to delete bill ${pur.billNumber}?`)) {
                                  deletePurchaseMutation.mutate(pur.id);
                                }
                              }}
                              disabled={deletePurchaseMutation.isPending}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer disabled:opacity-30"
                              title="Delete Bill"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

        {/* IMPORT PURCHASE BILLS MODAL */}
        {showImportModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
              
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-purple-50/60 to-white">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-purple-100 text-purple-700 rounded-xl">
                    <Upload size={20} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-800 text-lg">Import Purchase Invoices & Bills</h3>
                    <p className="text-xs text-slate-500">Upload CSV file to batch import supplier bills and expenses</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowImportModal(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Navigation Tabs */}
              <div className="flex border-b border-slate-200 px-6 bg-slate-50/50">
                <button
                  onClick={() => setImportTab("import")}
                  className={`py-3 px-4 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
                    importTab === "import"
                      ? "border-purple-600 text-purple-700 bg-white"
                      : "border-transparent text-slate-600 hover:text-slate-800"
                  }`}
                >
                  <FileSpreadsheet size={15} />
                  <span>Import Bills</span>
                </button>
                <button
                  onClick={() => setImportTab("history")}
                  className={`py-3 px-4 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
                    importTab === "history"
                      ? "border-purple-600 text-purple-700 bg-white"
                      : "border-transparent text-slate-600 hover:text-slate-800"
                  }`}
                >
                  <History size={15} />
                  <span>Import History</span>
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto flex-1 space-y-6">
                {importTab === "import" ? (
                  <>
                    {/* Stepper Wizard */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className={`p-3 rounded-xl border transition-all ${
                        importStep === 1 
                          ? "border-purple-300 bg-purple-50/50 text-purple-800" 
                          : importStep > 1 
                            ? "border-emerald-200 bg-emerald-50/50 text-emerald-800" 
                            : "border-slate-200 bg-slate-50 text-slate-500"
                      }`}>
                        <div className="flex items-center gap-2 mb-1">
                          {importStep > 1 ? (
                            <CheckCircle2 size={16} className="text-emerald-600" />
                          ) : (
                            <span className="w-5 h-5 rounded-full bg-purple-600 text-white text-xs flex items-center justify-center font-bold">1</span>
                          )}
                          <span className="text-xs font-semibold">Download Template</span>
                        </div>
                        <p className="text-[11px] opacity-80">Use standard UK purchase invoice template</p>
                      </div>

                      <div className={`p-3 rounded-xl border transition-all ${
                        importStep === 2 
                          ? "border-purple-300 bg-purple-50/50 text-purple-800" 
                          : importStep > 2 
                            ? "border-emerald-200 bg-emerald-50/50 text-emerald-800" 
                            : "border-slate-200 bg-slate-50 text-slate-500"
                      }`}>
                        <div className="flex items-center gap-2 mb-1">
                          {importStep > 2 ? (
                            <CheckCircle2 size={16} className="text-emerald-600" />
                          ) : (
                            <span className={`w-5 h-5 rounded-full text-xs flex items-center justify-center font-bold ${
                              importStep === 2 ? "bg-purple-600 text-white" : "bg-slate-300 text-slate-600"
                            }`}>2</span>
                          )}
                          <span className="text-xs font-semibold">Upload CSV File</span>
                        </div>
                        <p className="text-[11px] opacity-80">Select and parse file from computer</p>
                      </div>

                      <div className={`p-3 rounded-xl border transition-all ${
                        importStep === 3 
                          ? "border-purple-300 bg-purple-50/50 text-purple-800" 
                          : "border-slate-200 bg-slate-50 text-slate-500"
                      }`}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`w-5 h-5 rounded-full text-xs flex items-center justify-center font-bold ${
                            importStep === 3 ? "bg-purple-600 text-white" : "bg-slate-300 text-slate-600"
                          }`}>3</span>
                          <span className="text-xs font-semibold">Preview & Commit</span>
                        </div>
                        <p className="text-[11px] opacity-80">Verify line totals & import to ledger</p>
                      </div>
                    </div>

                    {/* Step 1 & 2 Area */}
                    {importStep < 3 && (
                      <div className="space-y-5">
                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                          <div>
                            <h4 className="text-sm font-semibold text-slate-800">Sample Purchase Invoices CSV Template</h4>
                            <p className="text-xs text-slate-500 mt-0.5">Pre-configured with supplier name, dates, item lines, VAT rates, and account codes.</p>
                          </div>
                          <button
                            type="button"
                            onClick={handleDownloadSampleTemplate}
                            className="px-3.5 py-2 bg-white border border-slate-300 hover:border-purple-400 hover:text-purple-600 text-slate-700 text-xs font-semibold rounded-lg shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
                          >
                            <Download size={14} />
                            <span>Download Template</span>
                          </button>
                        </div>

                        {/* File Upload Zone */}
                        <div 
                          onClick={() => fileInputRef.current?.click()}
                          className="border-2 border-dashed border-purple-200 hover:border-purple-400 bg-purple-50/20 hover:bg-purple-50/40 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-colors text-center"
                        >
                          <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileUpload}
                            accept=".csv,text/csv"
                            className="hidden"
                          />
                          <div className="w-14 h-14 bg-purple-100 text-purple-700 rounded-full flex items-center justify-center mb-3 shadow-inner">
                            <Upload size={24} />
                          </div>
                          <h4 className="text-sm font-semibold text-slate-800 mb-1">Click to select or drag & drop CSV file</h4>
                          <p className="text-xs text-slate-500 max-w-sm mb-3">Ensure file is in .CSV format conforming to the template columns</p>
                          <span className="px-3 py-1 bg-purple-600 text-white text-xs font-medium rounded-md shadow-2xs">
                            Browse Files
                          </span>
                        </div>

                        {parseError && (
                          <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
                            <AlertCircle size={16} className="shrink-0" />
                            <span>{parseError}</span>
                          </div>
                        )}

                        {/* Available Fields Reference */}
                        <div className="border border-slate-200 rounded-xl overflow-hidden">
                          <div className="bg-slate-100/70 px-4 py-2.5 border-b border-slate-200 flex items-center gap-2">
                            <HelpCircle size={15} className="text-slate-500" />
                            <h5 className="text-xs font-semibold text-slate-700">Available CSV Fields Guide</h5>
                          </div>
                          <div className="p-3 bg-white overflow-x-auto text-xs">
                            <table className="w-full text-left">
                              <thead>
                                <tr className="border-b border-slate-100 text-[11px] text-slate-400 font-medium">
                                  <th className="pb-1.5">Column Header</th>
                                  <th className="pb-1.5">Requirement</th>
                                  <th className="pb-1.5">Description</th>
                                  <th className="pb-1.5">Example</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 text-slate-600 text-[11px]">
                                <tr>
                                  <td className="py-1.5 font-semibold text-purple-700">Supplier Name</td>
                                  <td><span className="px-1.5 py-0.5 bg-red-50 text-red-600 rounded text-[10px] font-bold">Mandatory</span></td>
                                  <td>Supplier name (auto-created in contacts if missing)</td>
                                  <td>Office Supplies UK Ltd</td>
                                </tr>
                                <tr>
                                  <td className="py-1.5 font-semibold text-purple-700">Bill Number</td>
                                  <td><span className="px-1.5 py-0.5 bg-red-50 text-red-600 rounded text-[10px] font-bold">Mandatory</span></td>
                                  <td>Unique bill reference (multi-items bundle by same bill #)</td>
                                  <td>BILL-2026-001</td>
                                </tr>
                                <tr>
                                  <td className="py-1.5 font-semibold text-slate-700">Bill Date</td>
                                  <td>Optional</td>
                                  <td>Date of supplier invoice (DD/MM/YYYY or YYYY-MM-DD)</td>
                                  <td>15/01/2026</td>
                                </tr>
                                <tr>
                                  <td className="py-1.5 font-semibold text-slate-700">Due Date</td>
                                  <td>Optional</td>
                                  <td>Payment due date (DD/MM/YYYY)</td>
                                  <td>14/02/2026</td>
                                </tr>
                                <tr>
                                  <td className="py-1.5 font-semibold text-slate-700">Description</td>
                                  <td>Optional</td>
                                  <td>Line item expense or goods description</td>
                                  <td>A4 Printing Paper</td>
                                </tr>
                                <tr>
                                  <td className="py-1.5 font-semibold text-slate-700">Quantity</td>
                                  <td>Optional</td>
                                  <td>Number of units purchased (default 1.00)</td>
                                  <td>5</td>
                                </tr>
                                <tr>
                                  <td className="py-1.5 font-semibold text-slate-700">Unit Price</td>
                                  <td>Optional</td>
                                  <td>Unit cost price excluding VAT</td>
                                  <td>12.50</td>
                                </tr>
                                <tr>
                                  <td className="py-1.5 font-semibold text-slate-700">VAT Rate (%)</td>
                                  <td>Optional</td>
                                  <td>VAT percentage (20.00, 5.00, 0.00)</td>
                                  <td>20.00</td>
                                </tr>
                                <tr>
                                  <td className="py-1.5 font-semibold text-slate-700">Account Code</td>
                                  <td>Optional</td>
                                  <td>Chart of accounts nominal code (default 5000)</td>
                                  <td>5000</td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Step 3: Preview and Commit */}
                    {importStep === 3 && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-3.5 bg-purple-50/60 border border-purple-200 rounded-xl">
                          <div className="flex items-center gap-2">
                            <FileSpreadsheet size={18} className="text-purple-700" />
                            <div>
                              <span className="text-xs font-semibold text-slate-800">{fileName}</span>
                              <p className="text-[11px] text-purple-700 font-medium mt-0.5">
                                Found {parsedRows.length} line items across {uniqueBillsCount} unique purchase bills ready for import
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setParsedRows([]);
                              setFileName("");
                              setImportStep(2);
                            }}
                            className="text-xs text-purple-600 hover:text-purple-800 font-medium cursor-pointer"
                          >
                            Change File
                          </button>
                        </div>

                        {/* Preview Table */}
                        <div className="border border-slate-200 rounded-xl overflow-hidden max-h-72 overflow-y-auto">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 z-10">
                              <tr className="text-[11px] text-slate-500 font-semibold uppercase">
                                <th className="px-3 py-2.5">Bill #</th>
                                <th className="px-3 py-2.5">Supplier</th>
                                <th className="px-3 py-2.5">Date</th>
                                <th className="px-3 py-2.5">Description</th>
                                <th className="px-3 py-2.5 text-right">Qty</th>
                                <th className="px-3 py-2.5 text-right">Unit Price</th>
                                <th className="px-3 py-2.5 text-right">VAT Rate</th>
                                <th className="px-3 py-2.5 text-right">Line Net</th>
                                <th className="px-3 py-2.5 text-center">Nominal</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-slate-700">
                              {parsedRows.map((r, i) => {
                                const qty = parseFloat(r.quantity) || 1;
                                const price = parseFloat(r.unitPrice) || 0;
                                const net = qty * price;
                                return (
                                  <tr key={i} className="hover:bg-purple-50/20 transition-colors">
                                    <td className="px-3 py-2 font-semibold text-purple-600">{r.billNumber}</td>
                                    <td className="px-3 py-2 font-medium">{r.supplierName}</td>
                                    <td className="px-3 py-2 text-slate-500">{r.billDate}</td>
                                    <td className="px-3 py-2 max-w-[180px] truncate">{r.description}</td>
                                    <td className="px-3 py-2 text-right">{r.quantity}</td>
                                    <td className="px-3 py-2 text-right">£{price.toFixed(2)}</td>
                                    <td className="px-3 py-2 text-right">{r.vatRate}%</td>
                                    <td className="px-3 py-2 text-right font-semibold">£{net.toFixed(2)}</td>
                                    <td className="px-3 py-2 text-center text-slate-500 font-mono text-[11px]">{r.accountCode}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  /* History Tab */
                  <div className="py-12 flex flex-col items-center justify-center text-center">
                    <div className="w-14 h-14 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mb-3">
                      <History size={24} />
                    </div>
                    <h4 className="text-sm font-semibold text-slate-700">No Import History</h4>
                    <p className="text-xs text-slate-400 max-w-sm mt-1">
                      Previously imported purchase CSV files and batch upload logs for this client will appear here.
                    </p>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setShowImportModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>

                {importTab === "import" && importStep === 3 && (
                  <button
                    type="button"
                    onClick={() => importPurchasesMutation.mutate(parsedRows)}
                    disabled={importPurchasesMutation.isPending || parsedRows.length === 0}
                    className="px-5 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    {importPurchasesMutation.isPending ? (
                      <>
                        <RefreshCw size={14} className="animate-spin" />
                        <span>Importing Bills...</span>
                      </>
                    ) : (
                      <>
                        <Check size={14} />
                        <span>Confirm & Import ({uniqueBillsCount} Bills)</span>
                      </>
                    )}
                  </button>
                )}
              </div>

            </div>
          </div>
        )}

      </div>
    </AppLayout>
  );
}
