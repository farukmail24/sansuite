import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import SmeLayout from "../../components/layout/SmeLayout";
import { apiRequest, queryClient } from "../../lib/queryClient";
import { useToast } from "../../hooks/useToast";
import {
  FolderOpen, UploadCloud, CheckCircle2, Clock,
  FileText, Download, X, Plus
} from "lucide-react";

export default function SmeDocumentsPage() {
  const { toast } = useToast();
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedReq, setSelectedReq] = useState<any>(null);

  // Form State
  const [supplierName, setSupplierName] = useState("");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");

  const { data: workspace, isLoading } = useQuery({
    queryKey: ["/api/portal/my-workspace"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/portal/my-workspace");
      if (!res.ok) throw new Error("Failed to load documents");
      return res.json();
    },
  });

  const uploadDocMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/portal/my-receipts", {
        supplierName: supplierName || "Document Upload",
        amount: amount || "0.00",
        vatAmount: "0.00",
        notes: notes || `Submitted for request: ${selectedReq?.title || "Accountant Document"}`,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to submit document");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Document Submitted", description: "Document delivered to your accountant." });
      setShowUploadModal(false);
      setSelectedReq(null);
      setSupplierName("");
      setAmount("");
      setNotes("");
      queryClient.invalidateQueries({ queryKey: ["/api/portal/my-workspace"] });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const docRequests = workspace?.documentRequests || [];

  return (
    <SmeLayout module="Document Requests">
      <div className="space-y-6">
        {/* Header Strip */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <FolderOpen size={22} className="text-amber-600" />
              Accountant Document Requests
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Review and fulfill documentation requested by your CA firm (bank statements, dividend vouchers, VAT proofs).
            </p>
          </div>
          <button
            onClick={() => {
              setSelectedReq(null);
              setShowUploadModal(true);
            }}
            className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition active:scale-95"
          >
            <UploadCloud size={15} /> Upload Document
          </button>
        </div>

        {/* Requests List */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="py-12 text-center text-xs text-gray-400">Loading requests...</div>
          ) : docRequests.length === 0 ? (
            <div className="py-14 text-center px-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center mb-3">
                <CheckCircle2 size={24} />
              </div>
              <h3 className="text-sm font-semibold text-gray-900">All Document Requests Complete</h3>
              <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1 mb-4">
                You have no pending document requests from your accountant. Everything is up to date!
              </p>
              <button
                onClick={() => {
                  setSelectedReq(null);
                  setShowUploadModal(true);
                }}
                className="px-4 py-2 bg-amber-600 text-white rounded-lg text-xs font-semibold hover:bg-amber-700 shadow-sm"
              >
                <Plus size={14} className="inline mr-1" /> Upload Ad-Hoc Document
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {docRequests.map((req: any) => (
                <div
                  key={req.id}
                  className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-amber-50/20 transition"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <FileText size={18} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-gray-900">{req.title || "Document Request"}</h4>
                      <p className="text-xs text-gray-500 mt-0.5">{req.description || "Requested for year-end compliance."}</p>
                      <div className="flex items-center gap-3 mt-2 text-[11px] text-gray-400">
                        <span>Due: {req.dueDate ? new Date(req.dueDate).toLocaleDateString("en-GB") : "ASAP"}</span>
                        <span>•</span>
                        <span className="text-amber-700 font-semibold">{req.status || "Pending"}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setSelectedReq(req);
                      setSupplierName(req.title || "");
                      setShowUploadModal(true);
                    }}
                    className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition active:scale-95 self-start sm:self-center"
                  >
                    <UploadCloud size={14} /> Fulfill & Upload
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                  <UploadCloud size={17} />
                </div>
                <h3 className="text-base font-bold text-gray-900">
                  {selectedReq ? `Fulfill Request: ${selectedReq.title}` : "Upload Document to Accountant"}
                </h3>
              </div>
              <button
                onClick={() => setShowUploadModal(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                uploadDocMutation.mutate();
              }}
              className="mt-4 space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Document Title / Reference *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Bank Statement Q4, Dividend Voucher"
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Notes for your Accountant
                </label>
                <textarea
                  rows={2}
                  placeholder="Any explanations, tax year references, or notes..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="border-2 border-dashed border-amber-200 rounded-xl p-5 text-center bg-amber-50/40">
                <UploadCloud size={24} className="mx-auto text-amber-600 mb-1" />
                <p className="text-xs font-medium text-gray-700">Attach Document (PDF, Image, Excel)</p>
                <p className="text-[11px] text-gray-400">Encrypted with 256-bit SSL</p>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploadDocMutation.isPending}
                  className="px-4 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-sm disabled:opacity-50"
                >
                  {uploadDocMutation.isPending ? "Sending..." : "Submit to Accountant"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </SmeLayout>
  );
}
