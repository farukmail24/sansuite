import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import AppLayout from "../../components/layout/AppLayout";
import { apiRequest, queryClient } from "../../lib/queryClient";
import { useToast } from "../../hooks/useToast";
import {
  Save, X, Search, FileText, Download, CheckCircle2,
  AlertTriangle, CreditCard, ChevronRight, DollarSign,
  Building, Calendar, CheckSquare, Square, RefreshCw
} from "lucide-react";
import { bookkeepingSidebar, getClientSidebar } from "./sidebar";
import ClientGuard from "./ClientGuard";

export default function PurchasePaymentsPage() {
  const [match, params] = useRoute("/bookkeeping/:id/purchase-payments");
  const clientId = match ? params.id : "";
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<"single" | "bacs">("bacs");
  const [searchTerm, setSearchTerm] = useState("");

  // Single payment modal
  const [showModal, setShowModal] = useState(false);
  const [selectedBill, setSelectedBill] = useState<any>(null);
  const [formData, setFormData] = useState({
    amount: "",
    bankAccountId: "",
    paymentDate: new Date().toISOString().split("T")[0],
    reference: ""
  });

  // BACS Batch state
  const [selectedBacsIds, setSelectedBacsIds] = useState<number[]>([]);
  const [bacsBankAccountId, setBacsBankAccountId] = useState<string>("");
  const [bacsProcessingDate, setBacsProcessingDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [bacsMarkPaid, setBacsMarkPaid] = useState<boolean>(true);
  const [showBacsModal, setShowBacsModal] = useState<boolean>(false);
  const [bacsResult, setBacsResult] = useState<any>(null);

  const { data: clients = [] } = useQuery({
    queryKey: ["/api/practice/clients"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/practice/clients");
      return res.json();
    },
  });
  const client = clients.find((c: any) => String(c.id) === clientId);

  const { data: bankAccounts = [] } = useQuery({
    queryKey: ["/api/bookkeeping/bank-accounts/client", clientId],
    queryFn: async () => {
      if (!clientId) return [];
      const res = await apiRequest("GET", `/api/bookkeeping/bank-accounts/client/${clientId}`);
      return res.json();
    },
    enabled: !!clientId
  });

  // Set default bank account if not set
  if (bankAccounts.length > 0 && !bacsBankAccountId) {
    setBacsBankAccountId(String(bankAccounts[0].id));
  }

  // Fetch unpaid bills with supplier bank details
  const { data: unpaidBills = [], isLoading: loadingBills, refetch: refetchBills } = useQuery({
    queryKey: [`/api/bookkeeping/bacs/client/${clientId}/unpaid-bills`],
    queryFn: async () => {
      if (!clientId) return [];
      const res = await apiRequest("GET", `/api/bookkeeping/bacs/client/${clientId}/unpaid-bills`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!clientId
  });

  const recordPayment = useMutation({
    mutationFn: async () => {
      if (!selectedBill) throw new Error("No bill selected");
      const res = await apiRequest("POST", `/api/bookkeeping/purchases/${selectedBill.id}/payment`, {
        ...formData,
        clientId
      });
      if (!res.ok) throw new Error("Failed to record payment");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/bookkeeping/bacs/client/${clientId}/unpaid-bills`] });
      queryClient.invalidateQueries({ queryKey: ["/api/bookkeeping/purchases/client", clientId] });
      queryClient.invalidateQueries({ queryKey: ["/api/bookkeeping/bank-accounts/client", clientId] });
      toast({ title: "Payment Recorded", description: "The payment has been logged successfully." });
      setShowModal(false);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, type: "error" })
  });

  const generateBacsMutation = useMutation({
    mutationFn: async () => {
      if (selectedBacsIds.length === 0) throw new Error("No bills selected for BACS export");
      if (!bacsBankAccountId) throw new Error("Please select a paying bank account");

      const res = await apiRequest("POST", `/api/bookkeeping/bacs/client/${clientId}/generate`, {
        billIds: selectedBacsIds,
        bankAccountId: parseInt(bacsBankAccountId),
        processingDate: bacsProcessingDate,
        markAsPaid: bacsMarkPaid,
      });
      if (!res.ok) throw new Error("Failed to generate BACS payment file");
      return res.json();
    },
    onSuccess: (data: any) => {
      setBacsResult(data);
      setShowBacsModal(true);
      refetchBills();
      queryClient.invalidateQueries({ queryKey: ["/api/bookkeeping/purchases/client", clientId] });
      queryClient.invalidateQueries({ queryKey: ["/api/bookkeeping/bank-accounts/client", clientId] });
      toast({
        title: "BACS File Ready",
        description: `Generated payment file for £${data.totalAmount} across ${data.totalBills} bill(s).`
      });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, type: "error" })
  });

  if (!clientId) {
    return <ClientGuard featureTitle="Purchase Payments" />;
  }

  const filteredBills = unpaidBills.filter((b: any) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      (b.billNumber || "").toLowerCase().includes(term) ||
      (b.supplierName || "").toLowerCase().includes(term) ||
      (b.grandTotal || "").includes(term)
    );
  });

  const selectedBillsObjects = unpaidBills.filter((b: any) => selectedBacsIds.includes(b.id));
  const totalSelectedAmount = selectedBillsObjects.reduce((sum: number, b: any) => sum + parseFloat(b.remainingAmount || "0"), 0);
  const countMissingBank = selectedBillsObjects.filter((b: any) => !b.hasValidBank).length;

  const handleSelectAllBacs = () => {
    if (selectedBacsIds.length === filteredBills.length) {
      setSelectedBacsIds([]);
    } else {
      setSelectedBacsIds(filteredBills.map((b: any) => b.id));
    }
  };

  const handleToggleBacsSelect = (id: number) => {
    if (selectedBacsIds.includes(id)) {
      setSelectedBacsIds(selectedBacsIds.filter(x => x !== id));
    } else {
      setSelectedBacsIds([...selectedBacsIds, id]);
    }
  };

  const openPaymentModal = (bill: any) => {
    setSelectedBill(bill);
    setFormData({
      amount: parseFloat(bill.remainingAmount || bill.grandTotal).toFixed(2),
      bankAccountId: bankAccounts.length > 0 ? String(bankAccounts[0].id) : "",
      paymentDate: new Date().toISOString().split("T")[0],
      reference: `Payment for ${bill.billNumber}`
    });
    setShowModal(true);
  };

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <AppLayout sidebar={getClientSidebar(clientId)} module="Bookkeeping">
      <div className="bg-gray-50 min-h-screen pb-12">
        {/* Top Breadcrumb */}
        <div className="bg-white px-6 py-3 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center text-sm text-gray-500 gap-2">
            <button onClick={() => navigate("/bookkeeping")} className="hover:text-purple-600">Bookkeeping</button>
            <ChevronRight size={14} />
            <button onClick={() => navigate(`/bookkeeping/${clientId}/purchases`)} className="hover:text-purple-600">{client?.clientName || "Client"}</button>
            <ChevronRight size={14} />
            <span className="font-medium text-gray-900">Purchase Payments & BACS</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab("single")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === "single" ? "bg-purple-600 text-white shadow-sm" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Single Bill Payments
            </button>
            <button
              onClick={() => setActiveTab("bacs")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                activeTab === "bacs" ? "bg-purple-600 text-white shadow-sm" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              <CreditCard size={14} /> BACS Batch Payment Export
            </button>
          </div>
        </div>

        <div className="p-6 max-w-7xl mx-auto space-y-6">
          {/* Header Title */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {activeTab === "bacs" ? "BACS Batch Supplier Payments" : "Outstanding Purchase Bills"}
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                {activeTab === "bacs"
                  ? "Select multiple approved bills, verify UK sort codes and account numbers, and export Standard 18 BACS files for online banking."
                  : "Review open supplier invoices and record manual settlements."}
              </p>
            </div>

            {activeTab === "bacs" && (
              <button
                onClick={() => generateBacsMutation.mutate()}
                disabled={selectedBacsIds.length === 0 || generateBacsMutation.isPending}
                className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-semibold flex items-center gap-2 shadow-sm transition-colors disabled:opacity-40"
              >
                <Download size={16} />
                {generateBacsMutation.isPending ? "Generating..." : `Generate BACS File (${selectedBacsIds.length})`}
              </button>
            )}
          </div>

          {/* BACS Options Bar (When BACS tab active) */}
          {activeTab === "bacs" && (
            <div className="bg-white p-4 rounded-xl border border-purple-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Paying Bank Account</label>
                  <select
                    value={bacsBankAccountId}
                    onChange={(e) => setBacsBankAccountId(e.target.value)}
                    className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-purple-500"
                  >
                    {bankAccounts.map((a: any) => (
                      <option key={a.id} value={a.id}>{a.bankName} (Acc: {a.accountNumber || "—"})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Processing Date</label>
                  <input
                    type="date"
                    value={bacsProcessingDate}
                    onChange={(e) => setBacsProcessingDate(e.target.value)}
                    className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs"
                  />
                </div>
                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-gray-700">
                    <input
                      type="checkbox"
                      checked={bacsMarkPaid}
                      onChange={(e) => setBacsMarkPaid(e.target.checked)}
                      className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    />
                    Mark selected bills as Paid upon generation
                  </label>
                </div>
              </div>

              {/* Total summary badge */}
              <div className="text-right">
                <p className="text-xs text-gray-500">Selected Amount ({selectedBacsIds.length} bills)</p>
                <p className="text-xl font-bold text-purple-700">£{totalSelectedAmount.toFixed(2)}</p>
                {countMissingBank > 0 && (
                  <p className="text-xs text-amber-600 flex items-center gap-1 justify-end mt-0.5">
                    <AlertTriangle size={12} /> {countMissingBank} supplier(s) missing bank details
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Table Container */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="font-semibold text-gray-800 text-sm">
                {activeTab === "bacs" ? "Select Bills to Include in BACS Batch" : "Unpaid Bills"}
              </h3>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search supplier, bill number..."
                  className="pl-9 pr-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none w-64"
                />
              </div>
            </div>

            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs font-semibold text-gray-500 border-b border-gray-200 uppercase tracking-wider">
                <tr>
                  {activeTab === "bacs" && (
                    <th className="px-4 py-3 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={selectedBacsIds.length === filteredBills.length && filteredBills.length > 0}
                        onChange={handleSelectAllBacs}
                        className="rounded border-gray-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                      />
                    </th>
                  )}
                  <th className="px-4 py-3">Bill Date</th>
                  <th className="px-4 py-3">Bill No.</th>
                  <th className="px-4 py-3">Supplier Name</th>
                  {activeTab === "bacs" && <th className="px-4 py-3">Bank Details (Sort / Acc)</th>}
                  <th className="px-4 py-3 text-right">Total (£)</th>
                  <th className="px-4 py-3 text-right">Balance Due (£)</th>
                  <th className="px-4 py-3 text-right">Due Date</th>
                  <th className="px-4 py-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loadingBills ? (
                  <tr><td colSpan={8} className="text-center py-10 text-gray-400">Loading unpaid bills...</td></tr>
                ) : filteredBills.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12">
                      <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center mb-2">
                        <CheckCircle2 size={24} />
                      </div>
                      <p className="text-sm font-semibold text-gray-700">No Unpaid Bills Found</p>
                      <p className="text-xs text-gray-400 mt-1">All purchase invoices are fully paid or none exist.</p>
                    </td>
                  </tr>
                ) : (
                  filteredBills.map((bill: any) => {
                    const isSelected = selectedBacsIds.includes(bill.id);
                    return (
                      <tr
                        key={bill.id}
                        className={`transition-colors ${isSelected ? "bg-purple-50/50" : "hover:bg-gray-50/70"}`}
                      >
                        {activeTab === "bacs" && (
                          <td className="px-4 py-3 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleBacsSelect(bill.id)}
                              className="rounded border-gray-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                            />
                          </td>
                        )}
                        <td className="px-4 py-3 text-gray-600 font-mono text-xs">
                          {new Date(bill.billDate).toLocaleDateString("en-GB")}
                        </td>
                        <td className="px-4 py-3 font-semibold text-purple-700">{bill.billNumber}</td>
                        <td className="px-4 py-3 font-medium text-gray-900">{bill.supplierName || "Supplier"}</td>

                        {activeTab === "bacs" && (
                          <td className="px-4 py-3 text-xs">
                            {bill.hasValidBank ? (
                              <span className="inline-flex items-center gap-1 text-emerald-700 font-mono bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                <CheckCircle2 size={12} />
                                {bill.cleanSortCode} / {bill.cleanAccountNumber}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                <AlertTriangle size={12} /> Missing bank details
                              </span>
                            )}
                          </td>
                        )}

                        <td className="px-4 py-3 text-right font-mono text-gray-700">£{parseFloat(bill.grandTotal).toFixed(2)}</td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-red-600">£{parseFloat(bill.remainingAmount).toFixed(2)}</td>
                        <td className="px-4 py-3 text-right text-xs text-orange-600">
                          {bill.dueDate ? new Date(bill.dueDate).toLocaleDateString("en-GB") : "—"}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => openPaymentModal(bill)}
                            className="px-3 py-1 bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 rounded text-xs font-medium transition-colors"
                          >
                            Pay Bill
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Single Payment Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
              <div className="flex justify-between items-center border-b pb-3">
                <h3 className="font-bold text-gray-900">Record Bill Settlement</h3>
                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X size={18} />
                </button>
              </div>

              <div className="bg-purple-50 p-3 rounded-lg border border-purple-100 text-xs space-y-1">
                <p><span className="font-semibold text-gray-700">Bill:</span> {selectedBill?.billNumber}</p>
                <p><span className="font-semibold text-gray-700">Supplier:</span> {selectedBill?.supplierName}</p>
                <p><span className="font-semibold text-gray-700">Remaining Balance:</span> £{parseFloat(selectedBill?.remainingAmount || "0").toFixed(2)}</p>
              </div>

              <div className="space-y-3 text-sm">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Amount to Pay (£)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Paying Bank Account</label>
                  <select
                    value={formData.bankAccountId}
                    onChange={(e) => setFormData({ ...formData, bankAccountId: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                  >
                    {bankAccounts.map((a: any) => (
                      <option key={a.id} value={a.id}>{a.bankName} (Bal: £{parseFloat(a.currentBalance || "0").toFixed(2)})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Payment Date</label>
                  <input
                    type="date"
                    value={formData.paymentDate}
                    onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Reference</label>
                  <input
                    type="text"
                    value={formData.reference}
                    onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => recordPayment.mutate()}
                  disabled={recordPayment.isPending}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-semibold shadow-sm disabled:opacity-50"
                >
                  {recordPayment.isPending ? "Recording..." : "Confirm Payment"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* BACS Result & Download Modal */}
        {showBacsModal && bacsResult && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 space-y-5 border border-gray-100">
              <div className="flex items-center justify-between border-b pb-4">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600">
                    <CheckCircle2 size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">BACS Payment Batch Generated</h3>
                    <p className="text-xs text-gray-500">Standard 18 formatted file ready for bank portal upload</p>
                  </div>
                </div>
                <button onClick={() => setShowBacsModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X size={18} />
                </button>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 bg-purple-50 rounded-xl border border-purple-100">
                  <p className="text-xs text-purple-600 uppercase font-bold">Total Batch</p>
                  <p className="text-xl font-bold text-purple-900 mt-1">£{bacsResult.totalAmount}</p>
                </div>
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                  <p className="text-xs text-emerald-600 uppercase font-bold">Bills Included</p>
                  <p className="text-xl font-bold text-emerald-900 mt-1">{bacsResult.totalBills}</p>
                </div>
                <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
                  <p className="text-xs text-blue-600 uppercase font-bold">Status</p>
                  <p className="text-xl font-bold text-blue-900 mt-1">
                    {bacsResult.markedAsPaid ? "Paid in Ledger" : "Export Only"}
                  </p>
                </div>
              </div>

              {/* Warning if any suppliers missing bank details */}
              {bacsResult.missingBankDetailsCount > 0 && (
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800 flex items-start gap-2">
                  <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Missing Bank Details for {bacsResult.missingBankDetailsCount} supplier(s):</p>
                    <p className="mt-0.5">
                      Some suppliers have placeholder sort codes or account numbers. Please update their details under Contacts before uploading to your live bank.
                    </p>
                  </div>
                </div>
              )}

              {/* Text Preview Box */}
              <div>
                <p className="text-xs font-semibold text-gray-700 mb-1">Standard 18 Format Preview:</p>
                <div className="bg-gray-900 text-emerald-400 p-3 rounded-lg font-mono text-xs overflow-x-auto max-h-36">
                  {bacsResult.bacsContent}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <p className="text-xs text-gray-500">Filename: <span className="font-mono text-gray-700">{bacsResult.filename}</span></p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => downloadFile(bacsResult.csvContent, `${bacsResult.filename.replace('.txt', '')}.csv`, "text/csv")}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-xs font-semibold hover:bg-gray-50 flex items-center gap-1.5"
                  >
                    <Download size={14} /> Download CSV
                  </button>
                  <button
                    onClick={() => downloadFile(bacsResult.bacsContent, bacsResult.filename, "text/plain")}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm"
                  >
                    <Download size={14} /> Download Standard 18 (.txt)
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
