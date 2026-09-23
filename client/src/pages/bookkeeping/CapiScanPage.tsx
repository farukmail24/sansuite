import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AppLayout from "../../components/layout/AppLayout";
import { apiRequest } from "../../lib/queryClient";
import { 
  Scan, 
  Upload, 
  FileText, 
  ChevronRight, 
  CheckCircle2, 
  Clock, 
  Eye, 
  X, 
  CheckSquare, 
  Sparkles, 
  Receipt, 
  ArrowUpRight 
} from "lucide-react";
import { bookkeepingSidebar, getClientSidebar } from "./sidebar";
import { useToast } from "../../hooks/useToast";
import GlobalMediaLibraryModal from "../../components/common/GlobalMediaLibraryModal";
import ClientGuard from "./ClientGuard";


interface ScannedDocument {
  id: string;
  filename: string;
  uploadDate: string;
  supplier: string;
  invoiceDate: string;
  netAmount: number;
  vatAmount: number;
  totalAmount: number;
  status: "Analyzing" | "Pending Review" | "Approved";
  nominalCode: string;
}

export default function CapiScanPage() {
  const [match, params] = useRoute("/bookkeeping/:id/*");
  const clientId = match ? params?.id : "";
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  if (!clientId) return <ClientGuard featureTitle="CapiScan" />;

  const [activeTab, setActiveTab] = useState<"All" | "Pending Review" | "Approved">("All");
  const [selectedDoc, setSelectedDoc] = useState<ScannedDocument | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showMediaModal, setShowMediaModal] = useState(false);


  // Initial Mock OCR scanned documents
  const [scannedDocs, setScannedDocs] = useState<ScannedDocument[]>([
    {
      id: "DOC-801",
      filename: "office_supplies_receipt.pdf",
      uploadDate: "2026-07-23 10:15",
      supplier: "Ryman Stationery UK",
      invoiceDate: "2026-07-22",
      netAmount: 120.00,
      vatAmount: 24.00,
      totalAmount: 144.00,
      status: "Pending Review",
      nominalCode: "7500 - Printing & Stationery"
    },
    {
      id: "DOC-802",
      filename: "software_subscription.pdf",
      uploadDate: "2026-07-23 09:30",
      supplier: "Adobe Systems Europe",
      invoiceDate: "2026-07-20",
      netAmount: 350.00,
      vatAmount: 70.00,
      totalAmount: 420.00,
      status: "Pending Review",
      nominalCode: "7506 - IT & Software Software"
    },
    {
      id: "DOC-803",
      filename: "client_lunch_receipt.jpg",
      uploadDate: "2026-07-21 16:45",
      supplier: "Pret A Manger London",
      invoiceDate: "2026-07-21",
      netAmount: 45.00,
      vatAmount: 9.00,
      totalAmount: 54.00,
      status: "Approved",
      nominalCode: "7400 - Travel & Entertainment"
    }
  ]);

  // Form edit states inside modal
  const [editSupplier, setEditSupplier] = useState("");
  const [editNet, setEditNet] = useState("");
  const [editVat, setEditVat] = useState("");
  const [editTotal, setEditTotal] = useState("");
  const [editNominal, setEditNominal] = useState("");

  const handleSimulatedUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    toast({ title: "Analyzing Receipt...", description: "CapiScan AI is extracting document text and amounts." });

    setTimeout(() => {
      const newDoc: ScannedDocument = {
        id: `DOC-${Math.floor(100 + Math.random() * 900)}`,
        filename: file.name,
        uploadDate: new Date().toISOString().replace("T", " ").substring(0, 16),
        supplier: file.name.toLowerCase().includes("amazon") ? "Amazon Business UK" : "Vodafone UK",
        invoiceDate: new Date().toISOString().split("T")[0],
        netAmount: 85.00,
        vatAmount: 17.00,
        totalAmount: 102.00,
        status: "Pending Review",
        nominalCode: "7500 - General Expenses"
      };

      setScannedDocs(prev => [newDoc, ...prev]);
      setIsProcessing(false);
      toast({ title: "OCR Extraction Complete", description: "Review and approve extracted details." });
    }, 1500);
  };

  const openReviewModal = (doc: ScannedDocument) => {
    setSelectedDoc(doc);
    setEditSupplier(doc.supplier);
    setEditNet(doc.netAmount.toString());
    setEditVat(doc.vatAmount.toString());
    setEditTotal(doc.totalAmount.toString());
    setEditNominal(doc.nominalCode);
  };

  const handleApproveBill = () => {
    if (!selectedDoc) return;

    setScannedDocs(prev => prev.map(d => d.id === selectedDoc.id ? { ...d, status: "Approved" } : d));
    setSelectedDoc(null);
    toast({ title: "Purchase Bill Approved", description: `Converted ${selectedDoc.supplier} invoice into Purchase Bill & synced to ledger.` });
  };

  const filteredDocs = scannedDocs.filter(d => {
    if (activeTab === "Pending Review") return d.status === "Pending Review";
    if (activeTab === "Approved") return d.status === "Approved";
    return true;
  });

  return (
    <AppLayout sidebar={clientId ? getClientSidebar(clientId) : bookkeepingSidebar} module="Bookkeeping">
      <div className="bg-gray-50 min-h-screen">
        {/* Navigation Breadcrumb */}
        <div className="bg-white px-4 py-2.5 border-b border-gray-200 flex items-center text-sm text-gray-500 gap-2">
          <button onClick={() => navigate("/bookkeeping")} className="hover:text-purple-600 font-medium transition-colors">Bookkeeping</button>
          <ChevronRight size={14} />
          <span className="font-semibold text-gray-800">CapiScan AI OCR</span>
        </div>

        <div className="p-6 max-w-[1600px] mx-auto space-y-6">
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-purple-900 via-slate-900 to-indigo-950 text-white rounded-2xl p-8 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-purple-500/20 text-purple-200 border border-purple-400/30 rounded-full text-xs font-semibold">
                <Sparkles size={14} className="text-amber-300" /> CapiScan AI Document Extraction
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight">Receipt & Purchase OCR Scanner</h1>
              <p className="text-purple-200 text-sm max-w-xl">
                Upload receipts and invoices. CapiScan automatically extracts supplier names, line items, dates, and VAT, converting them directly into Purchase Bills.
              </p>
            </div>

            {/* Dropzone Upload & Media Store Triggers */}
            <div className="flex items-center gap-3 flex-wrap">
              <button
                type="button"
                onClick={() => setShowMediaModal(true)}
                className="px-5 py-3 bg-slate-800 hover:bg-slate-700 text-purple-200 font-semibold rounded-xl text-sm shadow-md transition-all flex items-center gap-2 border border-purple-500/30 shrink-0"
              >
                <Sparkles size={16} className="text-amber-300" /> Practice Media Store
              </button>
              <label className="cursor-pointer px-6 py-3 bg-purple-500 hover:bg-purple-600 text-white font-semibold rounded-xl text-sm shadow-md transition-all flex items-center gap-2.5 shrink-0">
                <Upload size={18} />
                <span>{isProcessing ? "Analyzing Document..." : "Upload Receipts / Bills"}</span>
                <input type="file" onChange={handleSimulatedUpload} accept="image/*,.pdf" className="hidden" />
              </label>
            </div>
          </div>


          {/* Stats Bar */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center font-bold">
                <FileText size={22} />
              </div>
              <div>
                <div className="text-2xl font-black text-gray-900">{scannedDocs.length}</div>
                <div className="text-xs font-medium text-gray-500">Total Scanned Receipts</div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center font-bold">
                <Clock size={22} />
              </div>
              <div>
                <div className="text-2xl font-black text-amber-700">
                  {scannedDocs.filter(d => d.status === "Pending Review").length}
                </div>
                <div className="text-xs font-medium text-gray-500">Pending Staff Review</div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center font-bold">
                <CheckCircle2 size={22} />
              </div>
              <div>
                <div className="text-2xl font-black text-emerald-700">
                  {scannedDocs.filter(d => d.status === "Approved").length}
                </div>
                <div className="text-xs font-medium text-gray-500">Converted & Synced Bills</div>
              </div>
            </div>
          </div>

          {/* Document Inbox Table */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <h2 className="font-bold text-gray-900 text-lg">Scanned Document Inbox</h2>
                <p className="text-xs text-gray-500 mt-0.5">Review AI extracted data and convert to purchase ledger entries.</p>
              </div>

              {/* Tab Filters */}
              <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl text-xs font-semibold">
                <button
                  onClick={() => setActiveTab("All")}
                  className={`px-3 py-1.5 rounded-lg transition-colors ${activeTab === 'All' ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
                >
                  All ({scannedDocs.length})
                </button>
                <button
                  onClick={() => setActiveTab("Pending Review")}
                  className={`px-3 py-1.5 rounded-lg transition-colors ${activeTab === 'Pending Review' ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
                >
                  Pending Review ({scannedDocs.filter(d => d.status === 'Pending Review').length})
                </button>
                <button
                  onClick={() => setActiveTab("Approved")}
                  className={`px-3 py-1.5 rounded-lg transition-colors ${activeTab === 'Approved' ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
                >
                  Approved ({scannedDocs.filter(d => d.status === 'Approved').length})
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 border-b border-gray-200 text-gray-700 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-3">Doc Ref</th>
                    <th className="px-6 py-3">Filename</th>
                    <th className="px-6 py-3">Extracted Supplier</th>
                    <th className="px-6 py-3">Date</th>
                    <th className="px-6 py-3">Net</th>
                    <th className="px-6 py-3">VAT (20%)</th>
                    <th className="px-6 py-3">Total Amount</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredDocs.map((doc) => (
                    <tr key={doc.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="px-6 py-4 font-mono font-medium text-purple-700">{doc.id}</td>
                      <td className="px-6 py-4 font-medium text-gray-800 flex items-center gap-2">
                        <Receipt size={16} className="text-gray-400" /> {doc.filename}
                      </td>
                      <td className="px-6 py-4 font-bold text-gray-900">{doc.supplier}</td>
                      <td className="px-6 py-4 text-gray-600">{doc.invoiceDate}</td>
                      <td className="px-6 py-4 text-gray-700">£{doc.netAmount.toFixed(2)}</td>
                      <td className="px-6 py-4 text-gray-700">£{doc.vatAmount.toFixed(2)}</td>
                      <td className="px-6 py-4 font-bold text-gray-900">£{doc.totalAmount.toFixed(2)}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                          doc.status === 'Approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {doc.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => openReviewModal(doc)}
                          className="px-3 py-1.5 bg-purple-50 text-purple-700 hover:bg-purple-100 font-semibold rounded-lg border border-purple-200 transition-colors inline-flex items-center gap-1"
                        >
                          <Eye size={14} /> Review
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Side-by-Side OCR Review Modal */}
        {selectedDoc && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-4xl w-full p-6 shadow-2xl space-y-6 relative border border-gray-100 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-100 text-purple-700 rounded-xl flex items-center justify-center font-bold">
                    <Scan size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg">CapiScan AI Extraction Review</h3>
                    <p className="text-xs text-gray-500">{selectedDoc.filename} ({selectedDoc.id})</p>
                  </div>
                </div>
                <button onClick={() => setSelectedDoc(null)} className="text-gray-400 hover:text-gray-600 p-1">
                  <X size={20} />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Panel: Simulated Document Preview */}
                <div className="bg-slate-900 text-white rounded-xl p-6 flex flex-col justify-between space-y-6 min-h-[300px]">
                  <div className="flex items-center justify-between border-b border-slate-700 pb-3">
                    <span className="text-xs font-mono text-purple-300">DOCUMENT PREVIEW</span>
                    <span className="text-xs text-slate-400">High Confidence (98%)</span>
                  </div>

                  <div className="border border-slate-700 rounded-lg p-4 bg-slate-800/80 space-y-3 font-mono text-xs">
                    <div className="text-center border-b border-slate-700 pb-2 text-slate-300 font-bold">
                      *** {editSupplier.toUpperCase()} ***
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>DATE: {selectedDoc.invoiceDate}</span>
                      <span>REF: {selectedDoc.id}</span>
                    </div>
                    <div className="py-2 border-y border-slate-700 space-y-1">
                      <div className="flex justify-between text-slate-300">
                        <span>NET AMOUNT:</span>
                        <span>£{editNet}</span>
                      </div>
                      <div className="flex justify-between text-slate-300">
                        <span>VAT (20%):</span>
                        <span>£{editVat}</span>
                      </div>
                    </div>
                    <div className="flex justify-between text-emerald-400 font-bold text-sm pt-1">
                      <span>TOTAL PAID:</span>
                      <span>£{editTotal}</span>
                    </div>
                  </div>

                  <div className="text-xs text-slate-400 text-center">
                    CapiScan OCR parsed document text cleanly.
                  </div>
                </div>

                {/* Right Panel: Extracted Field Editor */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Supplier Name</label>
                    <input
                      type="text"
                      value={editSupplier}
                      onChange={(e) => setEditSupplier(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-purple-500 font-medium"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Net (£)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={editNet}
                        onChange={(e) => setEditNet(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">VAT (£)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={editVat}
                        onChange={(e) => setEditVat(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Total (£)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={editTotal}
                        onChange={(e) => setEditTotal(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-purple-500 font-bold text-gray-900"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Nominal Account Code</label>
                    <select
                      value={editNominal}
                      onChange={(e) => setEditNominal(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="7500 - Printing & Stationery">7500 - Printing & Stationery</option>
                      <option value="7506 - IT & Software">7506 - IT & Software</option>
                      <option value="7400 - Travel & Entertainment">7400 - Travel & Entertainment</option>
                      <option value="5000 - Cost of Goods Sold">5000 - Cost of Goods Sold</option>
                    </select>
                  </div>

                  <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
                    <button
                      onClick={() => setSelectedDoc(null)}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-xs font-semibold hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleApproveBill}
                      className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm flex items-center gap-1.5"
                    >
                      <CheckCircle2 size={16} /> Approve & Convert to Bill
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Global Practice Media Library Modal */}
        <GlobalMediaLibraryModal
          isOpen={showMediaModal}
          onClose={() => setShowMediaModal(false)}
          allowedTypes="PDF & Documents"
          title="Global Practice Media & Document Library"
          onSelectFile={(file) => {
            setShowMediaModal(false);
            toast({ title: "Document Attached", description: `Selected ${file.name} from Global Practice Media Store.` });
          }}
        />
      </div>
    </AppLayout>
  );
}
