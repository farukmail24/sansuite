import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/useToast";
import { Plus, Trash2, X, CheckCircle2, ArrowRight, RefreshCw, FileText, AlertCircle } from "lucide-react";

interface CreditNotesManagerProps {
  clientId: string;
  type: "Sales" | "Purchase";
  contacts: any[];
}

export default function CreditNotesManager({ clientId, type, contacts }: CreditNotesManagerProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [allocatingCn, setAllocatingCn] = useState<any>(null);
  const [allocations, setAllocations] = useState<Record<number, string>>({});

  // Form state
  const isSales = type === "Sales";
  const defaultPrefix = isSales ? "SCN" : "PCN";
  const [contactId, setContactId] = useState<string>("");
  const [creditNoteNumber, setCreditNoteNumber] = useState<string>(`${defaultPrefix}-${Date.now().toString().slice(-5)}`);
  const [creditNoteDate, setCreditNoteDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState<string>("");

  const [items, setItems] = useState<any[]>([
    { description: isSales ? "Credit on Sales" : "Credit from Supplier", quantity: 1, unitPrice: 0, vatRate: 20, nominalCode: isSales ? "4000" : "5000" }
  ]);

  // Fetch credit notes
  const { data: creditNotes = [], isLoading } = useQuery<any[]>({
    queryKey: [`/api/bookkeeping/credit-notes/client/${clientId}`, type],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/bookkeeping/credit-notes/client/${clientId}?type=${type}`);
      return res.ok ? res.json() : [];
    },
    enabled: !!clientId,
  });

  // Fetch unpaid items for allocation (invoices or purchases)
  const { data: openDocuments = [] } = useQuery<any[]>({
    queryKey: [isSales ? `/api/bookkeeping/invoices/client/${clientId}` : `/api/bookkeeping/purchases/client/${clientId}`],
    queryFn: async () => {
      const endpoint = isSales 
        ? `/api/bookkeeping/invoices/client/${clientId}`
        : `/api/bookkeeping/purchases/client/${clientId}`;
      const res = await apiRequest("GET", endpoint);
      return res.ok ? res.json() : [];
    },
    enabled: !!clientId && !!allocatingCn,
  });

  // Calculate live item totals
  const subTotal = items.reduce((sum, it) => sum + (Number(it.quantity || 0) * Number(it.unitPrice || 0)), 0);
  const vatTotal = items.reduce((sum, it) => {
    const net = Number(it.quantity || 0) * Number(it.unitPrice || 0);
    const rate = Number(it.vatRate || 0) / 100;
    return sum + (net * rate);
  }, 0);
  const grandTotal = subTotal + vatTotal;

  // Filter contacts by type
  const eligibleContacts = useMemo(() => {
    return contacts.filter((c: any) => {
      if (isSales) return c.contactType === "Customer" || c.type === "Customer" || !c.contactType;
      return c.contactType === "Supplier" || c.type === "Supplier" || !c.contactType;
    });
  }, [contacts, isSales]);

  // Filter open documents for the allocating credit note's contact
  const contactOpenDocs = useMemo(() => {
    if (!allocatingCn) return [];
    return openDocuments.filter((doc: any) => {
      const docContactId = isSales ? doc.customerId : doc.supplierId;
      const isUnpaid = doc.status !== "Paid" && doc.status !== "Void";
      return String(docContactId) === String(allocatingCn.contactId) && isUnpaid;
    });
  }, [openDocuments, allocatingCn, isSales]);

  // Create Credit Note Mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      if (!contactId) throw new Error(`Please select a ${isSales ? "customer" : "supplier"}`);
      if (grandTotal <= 0) throw new Error("Total amount must be greater than £0.00");

      const res = await apiRequest("POST", "/api/bookkeeping/credit-notes", {
        clientId: parseInt(clientId),
        contactId: parseInt(contactId),
        type,
        creditNoteNumber,
        creditNoteDate,
        subTotal,
        vatTotal,
        totalAmount: grandTotal,
        notes,
        items,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to create credit note");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/bookkeeping/credit-notes/client/${clientId}`, type] });
      setShowCreateModal(false);
      // Reset form
      setCreditNoteNumber(`${defaultPrefix}-${Date.now().toString().slice(-5)}`);
      setItems([{ description: isSales ? "Credit on Sales" : "Credit from Supplier", quantity: 1, unitPrice: 0, vatRate: 20, nominalCode: isSales ? "4000" : "5000" }]);
      setNotes("");
      toast({ title: "Credit Note Created", description: "Credit note saved and ready to allocate." });
    },
    onError: (err: any) => {
      toast({ title: "Creation Failed", description: err.message, variant: "destructive" });
    }
  });

  // Allocate Mutation
  const allocateMutation = useMutation({
    mutationFn: async () => {
      if (!allocatingCn) return;
      const formattedAllocations = Object.entries(allocations)
        .map(([idStr, amtStr]) => ({
          targetId: parseInt(idStr),
          amount: parseFloat(amtStr || "0")
        }))
        .filter(a => a.amount > 0);

      if (formattedAllocations.length === 0) throw new Error("Please allocate an amount against at least one document");

      const res = await apiRequest("POST", `/api/bookkeeping/credit-notes/${allocatingCn.id}/allocate`, {
        allocations: formattedAllocations,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to allocate credit note");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/bookkeeping/credit-notes/client/${clientId}`, type] });
      queryClient.invalidateQueries({ queryKey: [isSales ? `/api/bookkeeping/invoices/client/${clientId}` : `/api/bookkeeping/purchases/client/${clientId}`] });
      setAllocatingCn(null);
      setAllocations({});
      toast({ title: "Credit Note Allocated", description: "Successfully applied credit to open balance." });
    },
    onError: (err: any) => {
      toast({ title: "Allocation Failed", description: err.message, variant: "destructive" });
    }
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/bookkeeping/credit-notes/${id}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to delete credit note");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/bookkeeping/credit-notes/client/${clientId}`, type] });
      toast({ title: "Credit Note Deleted", description: "Credit note removed and balance restored." });
    },
    onError: (err: any) => {
      toast({ title: "Delete Failed", description: err.message, variant: "destructive" });
    }
  });

  const handleAutoAllocate = () => {
    if (!allocatingCn) return;
    let remaining = parseFloat(allocatingCn.remainingAmount || allocatingCn.totalAmount || "0");
    const newAllocs: Record<number, string> = {};

    for (const doc of contactOpenDocs) {
      const balance = parseFloat(doc.grandTotal || "0") - parseFloat(doc.paidAmount || "0");
      if (remaining <= 0) {
        newAllocs[doc.id] = "0.00";
      } else if (remaining >= balance) {
        newAllocs[doc.id] = balance.toFixed(2);
        remaining -= balance;
      } else {
        newAllocs[doc.id] = remaining.toFixed(2);
        remaining = 0;
      }
    }
    setAllocations(newAllocs);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold text-gray-800">{type} Credit Notes Register</h2>
          <p className="text-xs text-gray-500">
            Issue credit notes and allocate them against unpaid {isSales ? "sales invoices" : "purchase bills"}.
          </p>
        </div>
        <button 
          onClick={() => setShowCreateModal(true)}
          className="btn-SanSuite flex items-center gap-1.5"
        >
          <Plus size={14} /> + New {type} Credit Note
        </button>
      </div>

      {/* Credit Notes Table */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="bg-gray-50 text-xs font-semibold text-gray-500 border-b uppercase">
              <th className="px-5 py-3">Credit Note #</th>
              <th className="px-5 py-3">Date</th>
              <th className="px-5 py-3">{isSales ? "Customer" : "Supplier"}</th>
              <th className="px-5 py-3 text-right">Total (£)</th>
              <th className="px-5 py-3 text-right">Allocated (£)</th>
              <th className="px-5 py-3 text-right">Remaining (£)</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading ? (
              <tr><td colSpan={8} className="p-8 text-center text-gray-400 text-xs">Loading credit notes...</td></tr>
            ) : creditNotes.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-10 text-center text-gray-500 text-xs">
                  No {type.toLowerCase()} credit notes recorded. Click "+ New {type} Credit Note" to issue one.
                </td>
              </tr>
            ) : (
              creditNotes.map((cn: any) => {
                const total = parseFloat(cn.totalAmount || "0");
                const alloc = parseFloat(cn.allocatedAmount || "0");
                const remaining = parseFloat(cn.remainingAmount || String(total - alloc));
                const canAllocate = remaining > 0;

                return (
                  <tr key={cn.id} className="hover:bg-gray-50/50">
                    <td className="px-5 py-3 font-semibold font-mono text-xs text-purple-700">{cn.creditNoteNumber}</td>
                    <td className="px-5 py-3 text-xs text-gray-600">
                      {cn.creditNoteDate ? new Date(cn.creditNoteDate).toLocaleDateString("en-GB") : "—"}
                    </td>
                    <td className="px-5 py-3 font-medium text-gray-800">{cn.contactName || "Contact"}</td>
                    <td className="px-5 py-3 text-right font-mono text-xs">£{total.toFixed(2)}</td>
                    <td className="px-5 py-3 text-right font-mono text-xs text-emerald-600">£{alloc.toFixed(2)}</td>
                    <td className="px-5 py-3 text-right font-mono text-xs font-bold text-gray-900">£{remaining.toFixed(2)}</td>
                    <td className="px-5 py-3">
                      <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${
                        cn.status === "Allocated" ? "bg-emerald-50 text-emerald-700" :
                        cn.status === "Part-Allocated" ? "bg-blue-50 text-blue-700" : "bg-purple-50 text-purple-700"
                      }`}>
                        {cn.status || "Issued"}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {canAllocate && (
                          <button 
                            onClick={() => {
                              setAllocatingCn(cn);
                              setAllocations({});
                            }}
                            className="px-2.5 py-1 text-xs font-medium border border-purple-200 text-purple-700 rounded hover:bg-purple-50 inline-flex items-center gap-1"
                          >
                            <ArrowRight size={12} /> Allocate
                          </button>
                        )}
                        <button 
                          onClick={() => {
                            if (confirm(`Are you sure you want to delete credit note ${cn.creditNoteNumber}?`)) {
                              deleteMutation.mutate(cn.id);
                            }
                          }}
                          className="text-gray-400 hover:text-red-600 p-1 rounded"
                          title="Delete Credit Note"
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
      </div>

      {/* Create Credit Note Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col">
            <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50 rounded-t-xl">
              <h3 className="font-bold text-gray-800">New {type} Credit Note</h3>
              <button onClick={() => setShowCreateModal(false)}><X size={18} className="text-gray-400" /></button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Select {isSales ? "Customer" : "Supplier"} *</label>
                  <select 
                    value={contactId} 
                    onChange={(e) => setContactId(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-xs focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">Choose {isSales ? "customer" : "supplier"}...</option>
                    {eligibleContacts.map((c: any) => (
                      <option key={c.id} value={c.id}>{c.name || c.contactName}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Credit Note # *</label>
                  <input 
                    type="text" 
                    value={creditNoteNumber} 
                    onChange={(e) => setCreditNoteNumber(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-xs font-mono focus:ring-2 focus:ring-purple-500" 
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Credit Note Date *</label>
                  <input 
                    type="date" 
                    value={creditNoteDate} 
                    onChange={(e) => setCreditNoteDate(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-xs focus:ring-2 focus:ring-purple-500" 
                  />
                </div>
              </div>

              {/* Line Items */}
              <div className="border rounded-lg overflow-hidden">
                <div className="px-3 py-2 bg-gray-50 border-b font-semibold text-gray-700">Line Items</div>
                <table className="w-full text-left">
                  <thead className="bg-gray-50/50 text-[11px] text-gray-500 border-b">
                    <tr>
                      <th className="p-2">Description</th>
                      <th className="p-2 w-16">Qty</th>
                      <th className="p-2 w-24">Unit Price</th>
                      <th className="p-2 w-24">VAT Rate</th>
                      <th className="p-2 w-24 text-right">Net Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {items.map((it, idx) => {
                      const lineNet = (Number(it.quantity || 0) * Number(it.unitPrice || 0));
                      return (
                        <tr key={idx}>
                          <td className="p-2">
                            <input 
                              type="text" 
                              value={it.description} 
                              onChange={(e) => {
                                const copy = [...items];
                                copy[idx].description = e.target.value;
                                setItems(copy);
                              }}
                              className="w-full px-2 py-1 border rounded text-xs" 
                            />
                          </td>
                          <td className="p-2">
                            <input 
                              type="number" 
                              value={it.quantity} 
                              onChange={(e) => {
                                const copy = [...items];
                                copy[idx].quantity = e.target.value;
                                setItems(copy);
                              }}
                              className="w-full px-2 py-1 border rounded text-xs font-mono" 
                            />
                          </td>
                          <td className="p-2">
                            <input 
                              type="number" 
                              step="0.01" 
                              value={it.unitPrice} 
                              onChange={(e) => {
                                const copy = [...items];
                                copy[idx].unitPrice = e.target.value;
                                setItems(copy);
                              }}
                              className="w-full px-2 py-1 border rounded text-xs font-mono" 
                            />
                          </td>
                          <td className="p-2">
                            <select 
                              value={it.vatRate} 
                              onChange={(e) => {
                                const copy = [...items];
                                copy[idx].vatRate = e.target.value;
                                setItems(copy);
                              }}
                              className="w-full px-2 py-1 border rounded text-xs"
                            >
                              <option value="20">20% Standard</option>
                              <option value="5">5% Reduced</option>
                              <option value="0">0% Zero</option>
                            </select>
                          </td>
                          <td className="p-2 text-right font-mono font-semibold">
                            £{lineNet.toFixed(2)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Totals Summary */}
              <div className="p-3 bg-gray-50 border rounded-lg flex justify-end">
                <div className="space-y-1 w-56 text-xs">
                  <div className="flex justify-between"><span className="text-gray-500">Subtotal:</span><span className="font-mono">£{subTotal.toFixed(2)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">VAT Total:</span><span className="font-mono">£{vatTotal.toFixed(2)}</span></div>
                  <div className="flex justify-between pt-1 border-t font-bold text-sm">
                    <span>Credit Note Total:</span>
                    <span className="font-mono text-purple-700">£{grandTotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Reason / Notes</label>
                <textarea 
                  rows={2} 
                  value={notes} 
                  onChange={(e) => setNotes(e.target.value)} 
                  placeholder="e.g. Return of damaged goods" 
                  className="w-full px-3 py-1.5 border rounded-lg text-xs"
                />
              </div>
            </div>

            <div className="px-6 py-3 border-t bg-gray-50 rounded-b-xl flex justify-end gap-2">
              <button onClick={() => setShowCreateModal(false)} className="px-4 py-1.5 text-xs border rounded-lg hover:bg-gray-100">Cancel</button>
              <button 
                onClick={() => createMutation.mutate()} 
                disabled={createMutation.isPending || grandTotal <= 0} 
                className="btn-SanSuite flex items-center gap-1.5 disabled:opacity-50"
              >
                <CheckCircle2 size={13} /> {createMutation.isPending ? "Creating..." : "Save Credit Note"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Allocate Credit Note Modal */}
      {allocatingCn && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col">
            <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50 rounded-t-xl">
              <div>
                <h3 className="font-bold text-gray-800">Allocate Credit Note ({allocatingCn.creditNoteNumber})</h3>
                <p className="text-xs text-gray-500">
                  Remaining Credit Available: <strong className="text-purple-700 font-mono">£{parseFloat(allocatingCn.remainingAmount || allocatingCn.totalAmount || "0").toFixed(2)}</strong>
                </p>
              </div>
              <button onClick={() => setAllocatingCn(null)}><X size={18} className="text-gray-400" /></button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-gray-700">Open {isSales ? "Invoices" : "Bills"} ({contactOpenDocs.length})</span>
                {contactOpenDocs.length > 0 && (
                  <button 
                    type="button" 
                    onClick={handleAutoAllocate}
                    className="px-2.5 py-1 text-xs bg-purple-50 text-purple-700 rounded border border-purple-200 font-medium flex items-center gap-1 hover:bg-purple-100"
                  >
                    <RefreshCw size={11} /> Auto-Allocate
                  </button>
                )}
              </div>

              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 text-[11px] font-semibold text-gray-500 border-b">
                    <tr>
                      <th className="p-2.5">Date</th>
                      <th className="p-2.5">Doc #</th>
                      <th className="p-2.5 text-right">Total (£)</th>
                      <th className="p-2.5 text-right">Balance Due (£)</th>
                      <th className="p-2.5 text-right w-36">Apply Credit (£)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {contactOpenDocs.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-6 text-center text-gray-400 text-xs">
                          No open documents found for this contact.
                        </td>
                      </tr>
                    ) : (
                      contactOpenDocs.map((doc: any) => {
                        const balance = parseFloat(doc.grandTotal || "0") - parseFloat(doc.paidAmount || "0");
                        const allocVal = allocations[doc.id] || "";
                        return (
                          <tr key={doc.id} className="hover:bg-gray-50/50">
                            <td className="p-2.5 text-gray-600">
                              {doc.invoiceDate || doc.billDate ? new Date(doc.invoiceDate || doc.billDate).toLocaleDateString("en-GB") : "—"}
                            </td>
                            <td className="p-2.5 font-semibold text-purple-700">{doc.invoiceNumber || doc.billNumber}</td>
                            <td className="p-2.5 text-right font-mono">£{parseFloat(doc.grandTotal || "0").toFixed(2)}</td>
                            <td className="p-2.5 text-right font-mono font-bold text-red-600">£{balance.toFixed(2)}</td>
                            <td className="p-2.5 text-right">
                              <input 
                                type="number" 
                                step="0.01" 
                                max={balance} 
                                placeholder="0.00" 
                                value={allocVal} 
                                onChange={(e) => {
                                  setAllocations({ ...allocations, [doc.id]: e.target.value });
                                }}
                                className="w-32 px-2 py-1 text-right text-xs border rounded font-mono font-bold focus:ring-2 focus:ring-purple-500" 
                              />
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="px-6 py-3 border-t bg-gray-50 rounded-b-xl flex justify-end gap-2">
              <button onClick={() => setAllocatingCn(null)} className="px-4 py-1.5 text-xs border rounded-lg hover:bg-gray-100">Cancel</button>
              <button 
                onClick={() => allocateMutation.mutate()} 
                disabled={allocateMutation.isPending || contactOpenDocs.length === 0} 
                className="btn-SanSuite flex items-center gap-1.5 disabled:opacity-50"
              >
                <CheckCircle2 size={13} /> {allocateMutation.isPending ? "Allocating..." : "Confirm Allocation"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
