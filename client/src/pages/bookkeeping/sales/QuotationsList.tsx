import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import AppLayout from "../../../components/layout/AppLayout";
import { apiRequest, queryClient } from "../../../lib/queryClient";
import { useToast } from "../../../hooks/useToast";
import { FileText, Plus, Search, ChevronRight, Pencil, Trash2, Send, Mail, X, Building2, Download, Eye, FileCheck } from "lucide-react";
import { getClientSidebar, bookkeepingSidebar } from "../sidebar";
import { generateSanSuiteInvoicePdf } from "../../../lib/sanSuiteInvoicePdfGenerator";

export default function QuotationsList() {
  const [match, params] = useRoute("/bookkeeping/:id/quotes");
  const [, navigate] = useLocation();
  const clientId = params?.id;
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");

  // Send Email Modal State
  const [emailModalQuote, setEmailModalQuote] = useState<any>(null);
  const [recipientEmail, setRecipientEmail] = useState("");

  const { data: quotes = [], isLoading } = useQuery({
    queryKey: [`/api/bookkeeping/quotes/client/${clientId}`],
    queryFn: async () => {
      const url = clientId ? `/api/bookkeeping/quotes/client/${clientId}` : "/api/bookkeeping/quotes";
      const res = await apiRequest("GET", url);
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

  const { data: singleClient } = useQuery({
    queryKey: [`/api/practice/clients/${clientId}`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/practice/clients/${clientId}`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!clientId,
  });

  const client = clients.find((c: any) => String(c.id) === clientId) || singleClient;

  // Fetch real client bank accounts
  const { data: bankAccounts = [] } = useQuery({
    queryKey: [`/api/bookkeeping/bank-accounts/client/${clientId}`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/bookkeeping/bank-accounts/client/${clientId}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!clientId,
  });

  // Fetch specific company details for current client
  const { data: companyData } = useQuery({
    queryKey: [`/api/bookkeeping/settings/${clientId}/company-info`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/bookkeeping/settings/${clientId}/company-info`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!clientId,
  });

  const companyInfo = companyData?.companyInfo;

  const effectiveCompanyName =
    companyInfo?.name ||
    client?.clientName ||
    client?.companyName ||
    client?.businessName ||
    "Company";

  const effectiveRegNo =
    companyInfo?.registrationNumber ||
    client?.registrationNumber ||
    client?.companyNumber ||
    "";

  const effectiveVatNo =
    companyInfo?.vatNumber ||
    client?.vatNumber ||
    "";

  const effectivePhone =
    companyInfo?.phone ||
    client?.phone ||
    client?.mobile ||
    "";

  const addressParts: string[] = [];
  const primaryAddr = companyInfo?.address || client?.address;
  if (primaryAddr) addressParts.push(primaryAddr);

  const city = companyInfo?.city || client?.city;
  const county = companyInfo?.county || client?.county;
  const postcode = companyInfo?.postcode || client?.postcode || client?.postalCode;
  const country = companyInfo?.country || client?.country || "United Kingdom";

  const secondLine = [city, county].filter(Boolean).join(", ");
  if (secondLine && !addressParts.includes(secondLine)) addressParts.push(secondLine);

  const postalCountryLine = [postcode, country].filter(Boolean).join(", ");
  if (postalCountryLine) addressParts.push(postalCountryLine);

  const formattedCompanyAddress = addressParts.join("\n");

  const handlePdfAction = async (q: any, action: "download" | "preview") => {
    let fullQuote = q;
    if (!q.items || q.items.length === 0) {
      try {
        const res = await apiRequest("GET", `/api/bookkeeping/quotes/details/${q.id}`);
        if (res.ok) {
          fullQuote = await res.json();
        }
      } catch (_) {}
    }

    const customerName = fullQuote.customerName || fullQuote.clientName || "Customer";
    const customerAddress = fullQuote.customerAddress || fullQuote.clientAddress || "";

    const rawItems = (fullQuote.items && fullQuote.items.length > 0) ? fullQuote.items : [];
    const itemsList = rawItems.length > 0
      ? rawItems.map((it: any) => {
          const qty = Number(it.quantity || 1);
          const uPrice = Number(it.unitPrice || it.rate || 0);
          const net = Number(it.netAmount || it.amount || (qty * uPrice));
          let vRateStr = "No VAT";
          let vRateNum = 0;
          if (it.vatRate !== null && it.vatRate !== undefined && it.vatRate !== "") {
            const vNum = Number(String(it.vatRate).replace("%", ""));
            if (!isNaN(vNum) && vNum > 0) {
              vRateStr = `${vNum}%`;
              vRateNum = vNum;
            }
          }
          const vAmount = it.vatAmount !== undefined && it.vatAmount !== null && it.vatAmount !== ""
            ? Number(it.vatAmount)
            : (net * (vRateNum / 100));
          const gross = Number(it.grossAmount || it.total || (net + vAmount));
          return {
            description: it.description || "Item 1",
            unitPrice: uPrice,
            quantity: qty,
            netAmount: net,
            vatRate: vRateStr,
            vatAmount: vAmount,
            grossAmount: gross,
          };
        })
      : [{
          description: "Quotation Items",
          unitPrice: Number(fullQuote.totalAmount || 0),
          quantity: 1,
          netAmount: Number(fullQuote.totalAmount || 0),
          vatRate: "No VAT",
          vatAmount: 0,
          grossAmount: Number(fullQuote.totalAmount || 0),
        }];

    let computedNet = 0;
    let computedVat = 0;
    itemsList.forEach((it: any) => {
      computedNet += Number(it.netAmount || 0);
      computedVat += Number(it.vatAmount || 0);
    });
    const quoteTotal = Number(fullQuote.totalAmount || (computedNet + computedVat));
    const effectiveNet = computedNet > 0 ? computedNet : quoteTotal;

    generateSanSuiteInvoicePdf({
      documentType: "Quotation",
      invoiceNumber: fullQuote.quoteNumber,
      invoiceDate: fullQuote.quoteDate ? new Date(fullQuote.quoteDate).toLocaleDateString("en-GB") : new Date().toLocaleDateString("en-GB"),
      dueDate: fullQuote.expiryDate ? new Date(fullQuote.expiryDate).toLocaleDateString("en-GB") : "-",
      reference: fullQuote.reference || fullQuote.notes || "",
      companyName: effectiveCompanyName,
      companyAddress: formattedCompanyAddress,
      companyPhone: effectivePhone,
      companyRegNo: effectiveRegNo,
      companyVatRegNo: effectiveVatNo,
      customerName,
      customerAddress,
      items: itemsList,
      netAmount: effectiveNet,
      vatAmount: computedVat,
      totalAmount: quoteTotal,
      dueAmount: quoteTotal,
      logoUrl: companyInfo?.logoUrl || client?.logoUrl || undefined,
    }, action);
  };

  const handleDownloadDocx = (q: any) => {
    window.location.href = `/api/bookkeeping/quotes/${q.id}/download-doc`;
  };

  // Status Update Mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const res = await apiRequest("PUT", `/api/bookkeeping/quotes/${id}`, { status });
      if (!res.ok) throw new Error("Failed to update status");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/bookkeeping/quotes/client/${clientId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/bookkeeping/quotes"] });
      toast({ title: "Status Updated", description: "Quotation status updated successfully." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message || "Failed to update status.", variant: "destructive" });
    },
  });

  // Delete Quotation Mutation
  const deleteQuoteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/bookkeeping/quotes/${id}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to delete quotation");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/bookkeeping/quotes/client/${clientId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/bookkeeping/quotes"] });
      toast({ title: "Quotation Deleted", description: "The sales quotation has been deleted successfully." });
    },
    onError: (err: any) => {
      toast({ title: "Delete Failed", description: err.message || "Could not delete quotation.", variant: "destructive" });
    },
  });

  // Send Email Mutation
  const sendEmailMutation = useMutation({
    mutationFn: async ({ id, email }: { id: number; email: string }) => {
      const res = await apiRequest("POST", `/api/bookkeeping/quotes/${id}/send-email`, { recipientEmail: email });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to send email");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [`/api/bookkeeping/quotes/client/${clientId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/bookkeeping/quotes"] });
      toast({ title: "Quotation Dispatched", description: data.message || "Quotation emailed to customer." });
      setEmailModalQuote(null);
    },
    onError: (err: any) => {
      toast({ title: "Email Failed", description: err.message || "Could not dispatch quotation email.", variant: "destructive" });
    },
  });

  const convertToInvoiceMutation = useMutation({
    mutationFn: async (quoteId: number) => {
      const res = await apiRequest("POST", `/api/bookkeeping/quotations/${quoteId}/convert-to-invoice`, {});
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to convert quotation to invoice");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [`/api/bookkeeping/quotes/client/${clientId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/bookkeeping/quotes"] });
      queryClient.invalidateQueries({ queryKey: [`/api/bookkeeping/invoices/client/${clientId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/bookkeeping/client/${clientId}/dashboard-analytics`] });
      toast({
        title: "Quotation Converted",
        description: data.message || `Sales Invoice ${data.invoiceNumber} created.`,
      });
      if (clientId) {
        navigate(`/bookkeeping/${clientId}/invoices`);
      }
    },
    onError: (err: any) => {
      toast({
        title: "Conversion Failed",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const filteredQuotes = quotes.filter((q: any) => {
    if (!searchQuery.trim()) return true;
    const search = searchQuery.toLowerCase();
    return (
      q.quoteNumber?.toLowerCase().includes(search) ||
      q.customerName?.toLowerCase().includes(search) ||
      q.clientName?.toLowerCase().includes(search) ||
      q.reference?.toLowerCase().includes(search) ||
      q.status?.toLowerCase().includes(search) ||
      q.totalAmount?.toString().includes(search)
    );
  });

  const handleOpenEmailModal = (q: any) => {
    setEmailModalQuote(q);
    setRecipientEmail(q.customerEmail || q.clientEmail || client?.email || "customer@example.com");
  };

  if (!clientId) {
    return (
      <AppLayout sidebar={bookkeepingSidebar} module="Bookkeeping">
        <div className="bg-gray-50 min-h-screen p-8 flex items-center justify-center">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center shadow-lg border border-slate-200 space-y-4 animate-in fade-in duration-150">
            <div className="w-16 h-16 bg-purple-100 text-purple-700 rounded-full flex items-center justify-center mx-auto">
              <Building2 size={32} />
            </div>
            <h2 className="text-xl font-bold text-slate-800">Select a Client / Workspace</h2>
            <p className="text-sm text-slate-500 leading-relaxed">
              Sales quotations are managed within a specific client workspace. Please select a client company from the Bookkeeping Dashboard.
            </p>
            <button
              onClick={() => navigate("/bookkeeping")}
              className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold text-sm transition-colors shadow-sm cursor-pointer"
            >
              Go to All Clients Dashboard
            </button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout sidebar={getClientSidebar(clientId)} module="Bookkeeping">
      <div className="bg-gray-50 min-h-screen pb-12">
        <div className="bg-white px-4 py-2 flex items-center justify-between border-b border-gray-200">
          <div className="flex items-center text-sm text-gray-500">
            <button onClick={() => navigate("/bookkeeping")} className="hover:text-purple-600 transition-colors">Bookkeeping</button>
            <ChevronRight size={14} className="mx-1" />
            <button onClick={() => navigate(`/bookkeeping/${clientId}`)} className="hover:text-purple-600 transition-colors">{client?.clientName || 'Client'}</button>
            <ChevronRight size={14} className="mx-1" />
            <span className="text-gray-800 font-medium">Sales Quotations</span>
          </div>
        </div>

        <div className="p-6 w-full mx-auto">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-semibold text-gray-800">Sales Quotations</h1>
              <p className="text-gray-500 text-sm mt-1">Manage, dispatch, and track your client's sales quotations.</p>
            </div>
            <button
              onClick={() => navigate(clientId ? `/bookkeeping/${clientId}/quotes/new` : "/bookkeeping/quotes/new")}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm transition-colors flex items-center gap-2 text-sm cursor-pointer"
            >
              <Plus size={16} /> New Quotation
            </button>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div className="relative w-72">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search quotations..."
                  className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 bg-white"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-xs font-semibold text-gray-500 border-b border-gray-200">
                    <th className="px-5 py-3 uppercase tracking-wider">Quote No.</th>
                    <th className="px-5 py-3 uppercase tracking-wider">Customer</th>
                    <th className="px-5 py-3 uppercase tracking-wider">Date</th>
                    <th className="px-5 py-3 uppercase tracking-wider">Expiry Date</th>
                    <th className="px-5 py-3 uppercase tracking-wider">Reference</th>
                    <th className="px-5 py-3 uppercase tracking-wider text-right">Total Amount</th>
                    <th className="px-5 py-3 uppercase tracking-wider text-center">Status</th>
                    <th className="px-5 py-3 uppercase tracking-wider text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {isLoading ? (
                    <tr><td colSpan={8} className="text-center py-8 text-gray-500">Loading quotations...</td></tr>
                  ) : filteredQuotes.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-12">
                        <div className="flex flex-col items-center">
                          <div className="w-16 h-16 bg-purple-50 rounded-full flex items-center justify-center text-purple-400 mb-4">
                            <FileText size={24} />
                          </div>
                          <p className="text-gray-600 font-medium">No sales quotations found.</p>
                          <p className="text-gray-400 text-sm mt-1 mb-4">Create your first quotation to get started.</p>
                          <button
                            onClick={() => navigate(clientId ? `/bookkeeping/${clientId}/quotes/new` : "/bookkeeping/quotes/new")}
                            className="text-purple-600 hover:text-purple-800 font-medium text-sm flex items-center gap-1"
                          >
                            <Plus size={14} /> Create Quotation
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredQuotes.map((q: any) => (
                      <tr key={q.id} className="border-b border-gray-100 hover:bg-purple-50/20">
                        <td className="px-5 py-4 font-medium text-purple-600">{q.quoteNumber}</td>
                        <td className="px-5 py-4 font-medium text-gray-800">{q.customerName || "-"}</td>
                        <td className="px-5 py-4 text-gray-600">{q.quoteDate ? new Date(q.quoteDate).toLocaleDateString("en-GB") : "—"}</td>
                        <td className="px-5 py-4 text-gray-600">{q.expiryDate ? new Date(q.expiryDate).toLocaleDateString("en-GB") : '—'}</td>
                        <td className="px-5 py-4 text-gray-600 font-medium">{q.reference || "—"}</td>
                        <td className="px-5 py-4 text-right font-medium text-gray-800">£{parseFloat(q.totalAmount || "0").toFixed(2)}</td>
                        <td className="px-5 py-4 text-center">
                          {/* STATUS DROPDOWN SELECTOR */}
                          <select
                            value={q.status || "Draft"}
                            onChange={(e) => updateStatusMutation.mutate({ id: q.id, status: e.target.value })}
                            className="text-xs font-semibold px-2.5 py-1 rounded-full border border-purple-200 bg-purple-50 text-purple-800 outline-none cursor-pointer hover:bg-purple-100 transition-colors capitalize"
                          >
                            <option value="Draft">Draft</option>
                            <option value="Sent">Sent</option>
                            <option value="Accepted">Accepted</option>
                            <option value="Declined">Declined</option>
                            <option value="Expired">Expired</option>
                          </select>
                        </td>
                        <td className="px-5 py-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* PREVIEW STANDARD PDF BUTTON */}
                            <button
                              onClick={() => handlePdfAction(q, "preview")}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors cursor-pointer"
                              title="Preview Standard PDF (SanSuite Template)"
                            >
                              <Eye size={15} />
                            </button>
                            {/* DOWNLOAD STANDARD PDF BUTTON */}
                            <button
                              onClick={() => handlePdfAction(q, "download")}
                              className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded transition-colors cursor-pointer"
                              title="Download Quotation PDF"
                            >
                              <Download size={15} />
                            </button>
                            {/* DOWNLOAD WORD (.DOCX) BUTTON */}
                            <button
                              onClick={() => handleDownloadDocx(q)}
                              className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded transition-colors cursor-pointer"
                              title="Download Word Document (Quotation.docx Template)"
                            >
                              <FileText size={15} />
                            </button>
                            {/* SEND EMAIL BUTTON */}
                            <button
                              onClick={() => handleOpenEmailModal(q)}
                              className="p-1.5 text-purple-600 hover:bg-purple-100 rounded transition-colors cursor-pointer"
                              title="Send Quotation Email to Customer"
                            >
                              <Send size={15} />
                            </button>
                            {/* CONVERT TO SALES INVOICE BUTTON */}
                            {q.status !== "Accepted" && (
                              <button
                                onClick={() => {
                                  if (confirm(`Convert quotation ${q.quoteNumber} into an active Sales Invoice?`)) {
                                    convertToInvoiceMutation.mutate(q.id);
                                  }
                                }}
                                disabled={convertToInvoiceMutation.isPending}
                                className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded transition-colors cursor-pointer"
                                title="Convert to Sales Invoice (Capium Parity)"
                              >
                                <FileCheck size={15} />
                              </button>
                            )}
                            {/* EDIT BUTTON */}
                            <button
                              onClick={() => navigate(clientId ? `/bookkeeping/${clientId}/quotes/${q.id}/edit` : `/bookkeeping/quotes/${q.id}/edit`)}
                              className="p-1.5 text-slate-500 hover:text-purple-600 hover:bg-purple-50 rounded transition-colors cursor-pointer"
                              title="Edit Quotation"
                            >
                              <Pencil size={15} />
                            </button>
                            {/* DELETE BUTTON */}
                            <button
                              onClick={() => {
                                if (confirm(`Are you sure you want to delete quotation ${q.quoteNumber}?`)) {
                                  deleteQuoteMutation.mutate(q.id);
                                }
                              }}
                              disabled={deleteQuoteMutation.isPending}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer disabled:opacity-30"
                              title="Delete Quotation"
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
        </div>
      </div>

      {/* SEND QUOTATION VIA EMAIL MODAL */}
      {emailModalQuote && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-200 animate-in fade-in duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-purple-100 text-purple-700 rounded-lg flex items-center justify-center font-bold">
                  <Mail size={16} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">Send Quotation via Email</h3>
                  <p className="text-[11px] text-slate-500">Dispatch {emailModalQuote.quoteNumber} to customer</p>
                </div>
              </div>
              <button onClick={() => setEmailModalQuote(null)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendEmailMutation.mutate({ id: emailModalQuote.id, email: recipientEmail });
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Customer Email Address *</label>
                <input
                  type="email"
                  required
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder="customer@company.co.uk"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs outline-none focus:border-purple-600"
                />
              </div>

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs space-y-1">
                <div className="flex justify-between text-slate-600">
                  <span>Quote Number:</span>
                  <span className="font-bold text-slate-800">{emailModalQuote.quoteNumber}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Quotation Total:</span>
                  <span className="font-bold text-purple-700">£{parseFloat(emailModalQuote.totalAmount || "0").toFixed(2)}</span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEmailModalQuote(null)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded text-xs font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sendEmailMutation.isPending}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded text-xs font-semibold shadow-xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  <Send size={14} />
                  {sendEmailMutation.isPending ? "Sending..." : "Send Quotation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
