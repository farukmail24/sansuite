import { useState, useMemo } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import AppLayout from "../../components/layout/AppLayout";
import { apiRequest, queryClient } from "../../lib/queryClient";
import { useToast } from "../../hooks/useToast";
import { Save, Plus, X, Search, FileText, CheckCircle2, UserCheck, ArrowDownRight, RefreshCw, Wallet } from "lucide-react";
import { bookkeepingSidebar, getClientSidebar } from "./sidebar";
import ClientGuard from "./ClientGuard";

export default function ReceiptsPage() {
  const [match, params] = useRoute("/bookkeeping/:id/receipts");
  const clientId = match ? params.id : "";
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<"invoices" | "multi">("invoices");
  const [searchTerm, setSearchTerm] = useState("");

  // Single-invoice Quick Pay Modal State
  const [showSingleModal, setShowSingleModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [singleFormData, setSingleFormData] = useState({
    amount: "",
    bankAccountId: "",
    paymentDate: new Date().toISOString().split("T")[0],
    reference: ""
  });

  // Multi-Invoice / Advance Receipt State
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [multiReceiptData, setMultiReceiptData] = useState({
    paymentDate: new Date().toISOString().split("T")[0],
    totalAmount: "",
    bankAccountId: "",
    reference: "",
    paymentMethod: "Bank Transfer",
    notes: "",
    isAdvance: false,
  });
  const [allocations, setAllocations] = useState<Record<number, string>>({});

  const { data: clients = [] } = useQuery({
    queryKey: ["/api/practice/clients"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/practice/clients");
      return res.json();
    },
  });
  const client = clients.find((c: any) => String(c.id) === clientId);

  const { data: contactsList = [] } = useQuery({
    queryKey: ["/api/bookkeeping/contacts/client", clientId],
    queryFn: async () => {
      if (!clientId) return [];
      const res = await apiRequest("GET", `/api/bookkeeping/contacts/client/${clientId}`);
      return res.ok ? res.json() : [];
    },
    enabled: !!clientId
  });

  const customers = useMemo(() => {
    return contactsList.filter((c: any) => c.contactType === "Customer" || c.type === "Customer" || !c.contactType);
  }, [contactsList]);

  const { data: invoices = [], isLoading: loadingInvoices } = useQuery({
    queryKey: ["/api/bookkeeping/invoices/client", clientId],
    queryFn: async () => {
      if (!clientId) return [];
      const res = await apiRequest("GET", `/api/bookkeeping/invoices/client/${clientId}`);
      return res.json();
    },
    enabled: !!clientId
  });

  const { data: bankAccounts = [] } = useQuery({
    queryKey: ["/api/bookkeeping/bank-accounts/client", clientId],
    queryFn: async () => {
      if (!clientId) return [];
      const res = await apiRequest("GET", `/api/bookkeeping/bank-accounts/client/${clientId}`);
      return res.json();
    },
    enabled: !!clientId
  });

  // Only show unpaid or partially paid invoices
  const unpaidInvoices = useMemo(() => {
    return invoices.filter((inv: any) => inv.status !== "Paid" && inv.status !== "Void");
  }, [invoices]);

  // Outstanding invoices for the selected customer in Multi-Receipt workflow
  const customerOpenInvoices = useMemo(() => {
    if (!selectedCustomerId) return [];
    return unpaidInvoices.filter((inv: any) => String(inv.customerId) === selectedCustomerId);
  }, [unpaidInvoices, selectedCustomerId]);

  // Total allocated across customer's open invoices
  const totalAllocated = useMemo(() => {
    return Object.values(allocations).reduce((sum, val) => sum + (parseFloat(val) || 0), 0);
  }, [allocations]);

  const enteredTotal = parseFloat(multiReceiptData.totalAmount || "0");
  const unallocatedAmount = Math.max(0, enteredTotal - totalAllocated);

  // Auto-allocate entered receipt amount against oldest customer invoices first
  const handleAutoAllocate = () => {
    let remaining = enteredTotal;
    const newAllocations: Record<number, string> = {};

    // Sort by invoiceDate ascending
    const sorted = [...customerOpenInvoices].sort((a, b) => 
      new Date(a.invoiceDate).getTime() - new Date(b.invoiceDate).getTime()
    );

    for (const inv of sorted) {
      const balance = parseFloat(inv.grandTotal || "0") - parseFloat(inv.paidAmount || "0");
      if (remaining <= 0) {
        newAllocations[inv.id] = "0.00";
      } else if (remaining >= balance) {
        newAllocations[inv.id] = balance.toFixed(2);
        remaining -= balance;
      } else {
        newAllocations[inv.id] = remaining.toFixed(2);
        remaining = 0;
      }
    }

    setAllocations(newAllocations);
  };

  const openSinglePaymentModal = (invoice: any) => {
    setSelectedInvoice(invoice);
    const balance = parseFloat(invoice.grandTotal) - parseFloat(invoice.paidAmount || "0");
    setSingleFormData({
      amount: balance.toFixed(2),
      bankAccountId: bankAccounts.length > 0 ? String(bankAccounts[0].id) : "",
      paymentDate: new Date().toISOString().split("T")[0],
      reference: `Payment for ${invoice.invoiceNumber}`
    });
    setShowSingleModal(true);
  };

  const recordSingleReceipt = useMutation({
    mutationFn: async () => {
      if (!selectedInvoice) throw new Error("No invoice selected");
      const res = await apiRequest("POST", `/api/bookkeeping/invoices/${selectedInvoice.id}/payment`, {
        ...singleFormData,
        clientId
      });
      if (!res.ok) throw new Error("Failed to record receipt");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookkeeping/invoices/client", clientId] });
      queryClient.invalidateQueries({ queryKey: ["/api/bookkeeping/bank-accounts/client", clientId] });
      toast({ title: "Receipt Recorded", description: "The payment has been logged successfully." });
      setShowSingleModal(false);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, type: "error" })
  });

  const multiAllocateMutation = useMutation({
    mutationFn: async () => {
      if (!selectedCustomerId) throw new Error("Please select a customer");
      if (!multiReceiptData.totalAmount || parseFloat(multiReceiptData.totalAmount) <= 0) {
        throw new Error("Please enter a valid receipt amount");
      }

      const formattedAllocations = Object.entries(allocations)
        .map(([invId, amt]) => ({ invoiceId: parseInt(invId), amount: parseFloat(amt) }))
        .filter(a => a.amount > 0);

      const res = await apiRequest("POST", "/api/bookkeeping/receipts/multi-allocate", {
        clientId: parseInt(clientId),
        customerId: parseInt(selectedCustomerId),
        paymentDate: multiReceiptData.paymentDate,
        totalAmount: multiReceiptData.totalAmount,
        bankAccountId: multiReceiptData.bankAccountId ? parseInt(multiReceiptData.bankAccountId) : undefined,
        reference: multiReceiptData.reference,
        paymentMethod: multiReceiptData.paymentMethod,
        isAdvance: multiReceiptData.isAdvance || unallocatedAmount > 0,
        allocations: formattedAllocations,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to process multi-invoice receipt");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookkeeping/invoices/client", clientId] });
      queryClient.invalidateQueries({ queryKey: ["/api/bookkeeping/bank-accounts/client", clientId] });
      queryClient.invalidateQueries({ queryKey: ["/api/bookkeeping/contacts/client", clientId] });
      toast({ 
        title: "Payment Allocated", 
        description: data.message || "Customer receipt allocated successfully." 
      });
      // Reset form
      setMultiReceiptData({
        paymentDate: new Date().toISOString().split("T")[0],
        totalAmount: "",
        bankAccountId: "",
        reference: "",
        paymentMethod: "Bank Transfer",
        notes: "",
        isAdvance: false,
      });
      setAllocations({});
      setActiveTab("invoices");
    },
    onError: (e: any) => toast({ title: "Allocation Failed", description: e.message, type: "error" })
  });

  if (!clientId) {
    return <ClientGuard featureTitle="Receipts" />;
  }

  const filteredUnpaidInvoices = unpaidInvoices.filter((inv: any) => {
    const q = searchTerm.toLowerCase();
    return (
      (inv.invoiceNumber && inv.invoiceNumber.toLowerCase().includes(q)) ||
      (inv.notes && inv.notes.toLowerCase().includes(q))
    );
  });

  return (
    <AppLayout sidebar={clientId ? getClientSidebar(clientId) : bookkeepingSidebar} module="Bookkeeping">
      <div className="bg-gray-50 min-h-screen">
        {/* Top Header */}
        <div className="bg-white px-6 py-3 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center text-sm text-gray-500 gap-2">
            <button onClick={() => navigate("/bookkeeping")} className="hover:text-purple-600">Bookkeeping</button>
            <span>/</span>
            <span className="font-medium text-gray-800">{client?.clientName || "Client"}</span>
            <span>/</span>
            <span className="text-gray-800 font-semibold">Customer Receipts</span>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setActiveTab(activeTab === "invoices" ? "multi" : "invoices")}
              className="btn-SanSuite flex items-center gap-2"
            >
              {activeTab === "invoices" ? (
                <>
                  <UserCheck size={14} /> + Multi-Invoice / Advance Receipt
                </>
              ) : (
                <>
                  <FileText size={14} /> Back to Open Invoices List
                </>
              )}
            </button>
          </div>
        </div>

        <div className="p-6 max-w-6xl mx-auto space-y-6">
          {activeTab === "multi" ? (
            /* Multi-Invoice & Advance Receipt Workflow (Capium Parity) */
            <div className="space-y-6">
              <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 space-y-5">
                <div className="border-b pb-3 flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-gray-800">Customer Payment & Multi-Invoice Allocation</h2>
                    <p className="text-xs text-gray-500">Apply a lump-sum payment across multiple open invoices or log customer advance credit.</p>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 bg-purple-50 text-purple-700 rounded-full border border-purple-100">
                    Capium-Standard Workflow
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Select Customer *</label>
                    <select 
                      value={selectedCustomerId} 
                      onChange={(e) => {
                        setSelectedCustomerId(e.target.value);
                        setAllocations({});
                      }}
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="">Choose a customer...</option>
                      {customers.map((c: any) => (
                        <option key={c.id} value={c.id}>
                          {c.name || c.contactName} {c.balance ? `(Due: £${parseFloat(c.balance).toFixed(2)})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Total Amount Received (£) *</label>
                    <input 
                      type="number" 
                      step="0.01" 
                      placeholder="0.00" 
                      value={multiReceiptData.totalAmount} 
                      onChange={(e) => setMultiReceiptData({ ...multiReceiptData, totalAmount: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg text-sm font-mono font-bold text-gray-800 focus:ring-2 focus:ring-purple-500" 
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Receipt Date *</label>
                    <input 
                      type="date" 
                      value={multiReceiptData.paymentDate} 
                      onChange={(e) => setMultiReceiptData({ ...multiReceiptData, paymentDate: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-purple-500" 
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Deposit To Bank Account</label>
                    <select 
                      value={multiReceiptData.bankAccountId} 
                      onChange={(e) => setMultiReceiptData({ ...multiReceiptData, bankAccountId: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="">Select bank account...</option>
                      {bankAccounts.map((a: any) => (
                        <option key={a.id} value={a.id}>{a.bankName} (Bal: £{parseFloat(a.currentBalance || "0").toFixed(2)})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Payment Method</label>
                    <select 
                      value={multiReceiptData.paymentMethod} 
                      onChange={(e) => setMultiReceiptData({ ...multiReceiptData, paymentMethod: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="Bank Transfer">Bank Transfer / BACS</option>
                      <option value="Debit / Credit Card">Debit / Credit Card</option>
                      <option value="Cheque">Cheque</option>
                      <option value="Cash">Cash</option>
                      <option value="Direct Debit">Direct Debit</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Reference / Cheque No.</label>
                    <input 
                      type="text" 
                      placeholder="e.g. BACS-9842" 
                      value={multiReceiptData.reference} 
                      onChange={(e) => setMultiReceiptData({ ...multiReceiptData, reference: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-purple-500" 
                    />
                  </div>
                </div>

                {/* Advance Receipt Option */}
                <div className="p-3 bg-purple-50/50 border border-purple-100 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      id="advanceToggle" 
                      checked={multiReceiptData.isAdvance || unallocatedAmount > 0} 
                      onChange={(e) => setMultiReceiptData({ ...multiReceiptData, isAdvance: e.target.checked })} 
                    />
                    <label htmlFor="advanceToggle" className="text-xs text-purple-900 font-medium cursor-pointer">
                      Save unallocated balance (£{unallocatedAmount.toFixed(2)}) as Advance Payment / Customer Credit Note
                    </label>
                  </div>
                  {enteredTotal > 0 && customerOpenInvoices.length > 0 && (
                    <button 
                      type="button" 
                      onClick={handleAutoAllocate}
                      className="text-xs px-3 py-1.5 bg-purple-600 text-white rounded-md font-medium hover:bg-purple-700 flex items-center gap-1.5 shadow-sm"
                    >
                      <RefreshCw size={12} /> Auto-Allocate Oldest First
                    </button>
                  )}
                </div>

                {/* Invoices Allocation Table */}
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="px-4 py-3 bg-gray-50 border-b flex justify-between items-center">
                    <h3 className="text-xs font-bold text-gray-700 uppercase">
                      Outstanding Invoices for Selected Customer ({customerOpenInvoices.length})
                    </h3>
                  </div>
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="bg-gray-50/50 text-xs font-semibold text-gray-500 border-b">
                        <th className="px-4 py-2.5">Date</th>
                        <th className="px-4 py-2.5">Invoice #</th>
                        <th className="px-4 py-2.5 text-right">Total (£)</th>
                        <th className="px-4 py-2.5 text-right">Paid (£)</th>
                        <th className="px-4 py-2.5 text-right">Balance Due (£)</th>
                        <th className="px-4 py-2.5 text-right w-44">Allocate Amount (£)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {!selectedCustomerId ? (
                        <tr>
                          <td colSpan={6} className="text-center py-8 text-gray-400 text-xs">
                            Select a customer above to view their outstanding invoices.
                          </td>
                        </tr>
                      ) : customerOpenInvoices.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="text-center py-8 text-gray-400 text-xs">
                            No open invoices for this customer. Any amount recorded will be saved as an Advance Receipt.
                          </td>
                        </tr>
                      ) : (
                        customerOpenInvoices.map((inv: any) => {
                          const balance = parseFloat(inv.grandTotal || "0") - parseFloat(inv.paidAmount || "0");
                          const allocVal = allocations[inv.id] || "";
                          return (
                            <tr key={inv.id} className="hover:bg-gray-50/50">
                              <td className="px-4 py-3 text-xs text-gray-600">
                                {inv.invoiceDate ? new Date(inv.invoiceDate).toLocaleDateString("en-GB") : "—"}
                              </td>
                              <td className="px-4 py-3 font-semibold text-purple-700">{inv.invoiceNumber}</td>
                              <td className="px-4 py-3 text-right font-mono text-xs">£{parseFloat(inv.grandTotal || "0").toFixed(2)}</td>
                              <td className="px-4 py-3 text-right font-mono text-xs text-emerald-600">£{parseFloat(inv.paidAmount || "0").toFixed(2)}</td>
                              <td className="px-4 py-3 text-right font-mono text-xs font-bold text-red-600">£{balance.toFixed(2)}</td>
                              <td className="px-4 py-3 text-right">
                                <input 
                                  type="number" 
                                  step="0.01" 
                                  max={balance} 
                                  placeholder="0.00" 
                                  value={allocVal} 
                                  onChange={(e) => {
                                    setAllocations({ ...allocations, [inv.id]: e.target.value });
                                  }}
                                  className="w-36 px-2.5 py-1 text-right text-sm border rounded font-mono font-bold focus:ring-2 focus:ring-purple-500" 
                                />
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Allocation Summary Bar */}
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-6 text-sm">
                    <div>
                      <span className="text-xs text-gray-500 block">Total Received</span>
                      <span className="font-bold text-gray-800 font-mono">£{enteredTotal.toFixed(2)}</span>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500 block">Allocated to Invoices</span>
                      <span className="font-bold text-emerald-600 font-mono">£{totalAllocated.toFixed(2)}</span>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500 block">Unallocated / Advance</span>
                      <span className={`font-bold font-mono ${unallocatedAmount > 0 ? "text-purple-700" : "text-gray-400"}`}>
                        £{unallocatedAmount.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button 
                      type="button" 
                      onClick={() => setActiveTab("invoices")} 
                      className="px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-100 font-medium"
                    >
                      Cancel
                    </button>
                    <button 
                      type="button" 
                      onClick={() => multiAllocateMutation.mutate()} 
                      disabled={multiAllocateMutation.isPending || enteredTotal <= 0 || !selectedCustomerId} 
                      className="btn-SanSuite flex items-center gap-2 disabled:opacity-50"
                    >
                      <Save size={14} />
                      {multiAllocateMutation.isPending ? "Allocating..." : "Confirm & Allocate Receipt"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Open Invoices List with Quick Pay */
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <div>
                  <h2 className="font-semibold text-gray-800">Outstanding Sales Invoices</h2>
                  <p className="text-xs text-gray-400">All unpaid and partially paid sales invoices</p>
                </div>
                <div className="relative w-64">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input 
                    type="text" 
                    placeholder="Search invoice number or notes..." 
                    value={searchTerm} 
                    onChange={(e) => setSearchTerm(e.target.value)} 
                    className="w-full pl-9 pr-4 py-1.5 text-sm border rounded-lg focus:ring-2 focus:ring-purple-500" 
                  />
                </div>
              </div>
              
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50 text-xs font-semibold text-gray-500 border-b border-gray-200 uppercase">
                    <th className="px-5 py-3">Date</th>
                    <th className="px-5 py-3">Invoice No.</th>
                    <th className="px-5 py-3 text-right">Total</th>
                    <th className="px-5 py-3 text-right">Paid</th>
                    <th className="px-5 py-3 text-right">Balance Due</th>
                    <th className="px-5 py-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {loadingInvoices ? (
                    <tr><td colSpan={6} className="text-center py-8 text-gray-400">Loading outstanding invoices...</td></tr>
                  ) : filteredUnpaidInvoices.length === 0 ? (
                    <tr><td colSpan={6} className="text-center py-10 text-gray-500 text-xs">No outstanding invoices found.</td></tr>
                  ) : filteredUnpaidInvoices.map((inv: any) => {
                    const balance = parseFloat(inv.grandTotal) - parseFloat(inv.paidAmount || "0");
                    return (
                      <tr key={inv.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                        <td className="px-5 py-3 text-gray-600">
                          {inv.invoiceDate ? new Date(inv.invoiceDate).toLocaleDateString("en-GB") : "—"}
                        </td>
                        <td className="px-5 py-3 font-semibold text-purple-700">{inv.invoiceNumber}</td>
                        <td className="px-5 py-3 text-right font-mono text-xs">£{parseFloat(inv.grandTotal).toFixed(2)}</td>
                        <td className="px-5 py-3 text-right font-mono text-xs text-emerald-600">£{parseFloat(inv.paidAmount || "0").toFixed(2)}</td>
                        <td className="px-5 py-3 text-right font-mono text-xs font-bold text-red-600">£{balance.toFixed(2)}</td>
                        <td className="px-5 py-3 text-center">
                          <button 
                            onClick={() => openSinglePaymentModal(inv)}
                            className="px-3 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded text-xs font-medium inline-flex items-center gap-1"
                          >
                            <ArrowDownRight size={12} /> Receive Payment
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Single Invoice Quick Receipt Modal */}
      {showSingleModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b bg-gray-50 flex justify-between items-center">
              <h3 className="font-semibold text-gray-800">Record Single Invoice Receipt</h3>
              <button onClick={() => setShowSingleModal(false)}><X size={20} className="text-gray-400" /></button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-100 rounded-lg text-blue-800 text-sm mb-2">
                <FileText size={16} className="text-blue-500" />
                <span>
                  Applying payment to <strong>{selectedInvoice?.invoiceNumber}</strong> (Balance: £{(parseFloat(selectedInvoice?.grandTotal) - parseFloat(selectedInvoice?.paidAmount || "0")).toFixed(2)})
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount Received (£) *</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    value={singleFormData.amount} 
                    onChange={(e) => setSingleFormData({ ...singleFormData, amount: e.target.value })} 
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date Received *</label>
                  <input 
                    type="date" 
                    value={singleFormData.paymentDate} 
                    onChange={(e) => setSingleFormData({ ...singleFormData, paymentDate: e.target.value })} 
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500" 
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Deposit To Bank Account</label>
                <select 
                  value={singleFormData.bankAccountId} 
                  onChange={(e) => setSingleFormData({ ...singleFormData, bankAccountId: e.target.value })} 
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">Do not deposit (Mark paid only)</option>
                  {bankAccounts.map((a: any) => (
                    <option key={a.id} value={a.id}>{a.bankName} - £{parseFloat(a.currentBalance || "0").toFixed(2)}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reference / Cheque No.</label>
                <input 
                  type="text" 
                  value={singleFormData.reference} 
                  onChange={(e) => setSingleFormData({ ...singleFormData, reference: e.target.value })} 
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500" 
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-3">
              <button onClick={() => setShowSingleModal(false)} className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-100">Cancel</button>
              <button 
                onClick={() => recordSingleReceipt.mutate()} 
                disabled={recordSingleReceipt.isPending || !singleFormData.amount} 
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm rounded-lg font-medium flex items-center gap-2 disabled:opacity-50"
              >
                <Save size={14} /> {recordSingleReceipt.isPending ? "Saving..." : "Save Receipt"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
