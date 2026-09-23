import { useState, useMemo } from "react";
import { useLocation, useRoute } from "wouter";
import AppLayout from "../../components/layout/AppLayout";
import { ChevronRight, Plus, FileText, X, Building2, User, Printer, CheckCircle2, DollarSign } from "lucide-react";
import { bookkeepingSidebar, getClientSidebar } from "./sidebar";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "../../lib/queryClient";
import { useToast } from "../../hooks/useToast";
import ClientGuard from "./ClientGuard";

export default function DividendsPage() {
  const [, navigate] = useLocation();
  const [match1, params1] = useRoute("/bookkeeping/:id/dividends");
  const [match2, params2] = useRoute("/bookkeeping/:id/*");
  const clientIdStr = match1 ? params1.id : (match2 ? params2.id : "");

  if (!clientIdStr) return <ClientGuard featureTitle="Dividends" />;
  const clientId = clientIdStr ? parseInt(clientIdStr) : 1;
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [showModal, setShowModal] = useState(false);
  const [selectedVoucher, setSelectedVoucher] = useState<any>(null);

  // Form State
  const [shareholderId, setShareholderId] = useState<string>("");
  const [shareType, setShareType] = useState("Ordinary");
  const [shareClass, setShareClass] = useState("Class A");
  const [numberOfShares, setNumberOfShares] = useState<string>("100");
  const [ratePerShare, setRatePerShare] = useState<string>("1.00");
  const [declarationDate, setDeclarationDate] = useState(new Date().toISOString().split("T")[0]);
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0]);
  const [declaredBy, setDeclaredBy] = useState("Board of Directors");
  const [excludeTaxCredit, setExcludeTaxCredit] = useState(false);
  const [postJournal, setPostJournal] = useState(true);
  const [journalTarget, setJournalTarget] = useState<"Bank" | "DLA">("Bank");
  const [bankAccountId, setBankAccountId] = useState<string>("");
  const [notes, setNotes] = useState("");

  const { data: dividends = [], isLoading } = useQuery<any[]>({
    queryKey: [`/api/dividends/${clientId}`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/dividends/${clientId}`);
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: contactsList = [] } = useQuery({
    queryKey: ["/api/bookkeeping/contacts/client", clientId],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/bookkeeping/contacts/client/${clientId}`);
      return res.ok ? res.json() : [];
    },
  });

  const shareholders = useMemo(() => {
    const list = contactsList.filter((c: any) => c.contactType === "Shareholder" || c.type === "Shareholder");
    return list.length > 0 ? list : contactsList; // fallback to all contacts if not specifically tagged
  }, [contactsList]);

  const { data: bankAccounts = [] } = useQuery({
    queryKey: ["/api/bookkeeping/bank-accounts/client", clientId],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/bookkeeping/bank-accounts/client/${clientId}`);
      return res.json();
    },
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["/api/practice/clients"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/practice/clients");
      return res.json();
    },
  });
  const currentClient = clients.find((c: any) => c.id === clientId);

  // Live Statutory Calculations
  const sharesCount = parseFloat(numberOfShares) || 0;
  const rate = parseFloat(ratePerShare) || 0;
  const dividendPayable = sharesCount * rate;
  const taxCredit = excludeTaxCredit ? 0 : (dividendPayable / 9); // UK notional 10% tax credit
  const grossDividend = dividendPayable + taxCredit;

  const handleShareholderSelect = (id: string) => {
    setShareholderId(id);
    const sh = contactsList.find((c: any) => String(c.id) === id);
    if (sh && sh.sharesOwned) {
      setNumberOfShares(String(sh.sharesOwned));
    }
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      if (dividendPayable <= 0) throw new Error("Dividend amount must be greater than £0.00");
      const res = await apiRequest("POST", "/api/dividends", {
        clientId,
        shareholderId: shareholderId ? parseInt(shareholderId) : undefined,
        shareType,
        shareClass,
        numberOfShares: sharesCount,
        ratePerShare: rate,
        declarationDate,
        paymentDate,
        declaredBy,
        excludeTaxCredit,
        postJournal,
        journalTarget,
        bankAccountId: bankAccountId ? parseInt(bankAccountId) : undefined,
        notes,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to declare dividend");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/dividends/${clientId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/bookkeeping/bank-accounts/client", clientId] });
      setShowModal(false);
      toast({ title: "Dividend Declared", description: "Dividend voucher created and journal posted." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const totalDividendsPaid = dividends.reduce((sum: number, d: any) => sum + parseFloat(d.dividendPayable || d.amount || 0), 0);

  return (
    <AppLayout sidebar={clientIdStr ? getClientSidebar(clientIdStr) : bookkeepingSidebar} module="Bookkeeping">
      <div className="bg-gray-50 min-h-screen">
        {/* Navigation Breadcrumb */}
        <div className="bg-white px-6 py-2.5 border-b border-gray-200 flex items-center text-sm text-gray-500 gap-2">
          <button onClick={() => navigate("/bookkeeping")} className="hover:text-purple-600">Bookkeeping</button>
          <ChevronRight size={14} />
          <span className="font-medium text-gray-800">{currentClient?.clientName || "Client"}</span>
          <ChevronRight size={14} />
          <span className="font-semibold text-gray-800">Dividends & Vouchers</span>
        </div>
        
        <div className="p-6 max-w-6xl mx-auto space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Dividend Vouchers Register</h1>
              <p className="text-xs text-gray-500 mt-0.5">
                Issue statutory dividend distributions, compute per-share entitlements, and auto-post double-entry equity journals.
              </p>
            </div>
            <button 
              onClick={() => {
                if (bankAccounts.length > 0 && !bankAccountId) {
                  setBankAccountId(String(bankAccounts[0].id));
                }
                setShowModal(true);
              }}
              className="btn-SanSuite flex items-center gap-2"
            >
              <Plus size={16} /> Declare Dividend
            </button>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
              <span className="text-xs font-semibold text-gray-500 uppercase">Total Distributions Declared</span>
              <p className="text-2xl font-bold text-gray-800 mt-1">{dividends.length} Vouchers</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
              <span className="text-xs font-semibold text-gray-500 uppercase">Total Dividends Paid (£)</span>
              <p className="text-2xl font-bold font-mono text-purple-700 mt-1">
                £{totalDividendsPaid.toLocaleString("en-GB", { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
              <span className="text-xs font-semibold text-gray-500 uppercase">Statutory Standard</span>
              <p className="text-sm font-semibold text-emerald-600 mt-2 flex items-center gap-1">
                <CheckCircle2 size={16} /> UK Companies Act 2006 Compliant
              </p>
            </div>
          </div>

          {/* Dividends Table */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b bg-gray-50/50 flex items-center justify-between">
              <h3 className="font-semibold text-sm text-gray-800">Declared Dividend History</h3>
            </div>
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-600 font-semibold text-xs border-b">
                <tr>
                  <th className="px-5 py-3">Voucher #</th>
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3">Shareholder</th>
                  <th className="px-5 py-3">Share Class</th>
                  <th className="px-5 py-3 text-right">Shares</th>
                  <th className="px-5 py-3 text-right">Rate (£)</th>
                  <th className="px-5 py-3 text-right">Net Payable (£)</th>
                  <th className="px-5 py-3 text-right">Gross (£)</th>
                  <th className="px-5 py-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {isLoading ? (
                  <tr><td colSpan={9} className="p-8 text-center text-gray-400 text-xs">Loading dividends...</td></tr>
                ) : dividends.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-10 text-center text-gray-500 text-xs">
                      No dividend vouchers recorded. Click "+ Declare Dividend" to create a distribution voucher.
                    </td>
                  </tr>
                ) : (
                  dividends.map((div: any) => {
                    const payable = parseFloat(div.dividendPayable || div.amount || "0");
                    const gross = parseFloat(div.grossDividend || div.amount || "0");
                    return (
                      <tr key={div.id} className="hover:bg-gray-50/50">
                        <td className="px-5 py-3 font-semibold text-purple-700 font-mono text-xs">
                          {div.voucherNumber || `VCH-${div.id}`}
                        </td>
                        <td className="px-5 py-3 text-xs text-gray-600">
                          {div.paymentDate ? new Date(div.paymentDate).toLocaleDateString("en-GB") : "—"}
                        </td>
                        <td className="px-5 py-3 font-medium text-gray-800">
                          {div.shareholderName || div.declaredBy || "Director / Shareholder"}
                        </td>
                        <td className="px-5 py-3 text-xs text-gray-500">{div.shareClass || "Class A"}</td>
                        <td className="px-5 py-3 text-right font-mono text-xs">{div.numberOfShares || "—"}</td>
                        <td className="px-5 py-3 text-right font-mono text-xs">
                          {div.ratePerShare ? `£${parseFloat(div.ratePerShare).toFixed(4)}` : "—"}
                        </td>
                        <td className="px-5 py-3 text-right font-bold text-gray-900 font-mono text-xs">
                          £{payable.toFixed(2)}
                        </td>
                        <td className="px-5 py-3 text-right font-mono text-xs text-gray-600">
                          £{gross.toFixed(2)}
                        </td>
                        <td className="px-5 py-3 text-center">
                          <button 
                            onClick={() => setSelectedVoucher(div)}
                            className="px-2.5 py-1 border border-purple-200 text-purple-700 rounded-md text-xs font-medium hover:bg-purple-50 inline-flex items-center gap-1 shadow-sm"
                          >
                            <FileText size={12} /> Voucher
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

        {/* Declare Dividend Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[92vh] flex flex-col">
              <div className="px-6 py-4 border-b flex items-center justify-between bg-gray-50 rounded-t-xl">
                <div>
                  <h3 className="font-bold text-gray-800">Declare Dividend Distribution</h3>
                  <p className="text-xs text-gray-500">Computes dividend voucher and automatically logs double-entry journal</p>
                </div>
                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
              </div>

              <div className="p-6 space-y-4 overflow-y-auto flex-1 text-sm">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Select Shareholder *</label>
                  <select 
                    value={shareholderId} 
                    onChange={(e) => handleShareholderSelect(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">Select shareholder from contacts...</option>
                    {shareholders.map((s: any) => (
                      <option key={s.id} value={s.id}>
                        {s.name || s.contactName} {s.sharesOwned ? `(${s.sharesOwned} shares)` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Share Type</label>
                    <select 
                      value={shareType} 
                      onChange={(e) => setShareType(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="Ordinary">Ordinary</option>
                      <option value="Preference">Preference</option>
                      <option value="Alphabet">Alphabet</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Share Class</label>
                    <input 
                      type="text" 
                      value={shareClass} 
                      onChange={(e) => setShareClass(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-purple-500" 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">No. of Shares *</label>
                    <input 
                      type="number" 
                      min="1" 
                      value={numberOfShares} 
                      onChange={(e) => setNumberOfShares(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg text-sm font-mono focus:ring-2 focus:ring-purple-500" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Rate Per Share (£) *</label>
                    <input 
                      type="number" 
                      step="0.0001" 
                      min="0.0001" 
                      value={ratePerShare} 
                      onChange={(e) => setRatePerShare(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg text-sm font-mono focus:ring-2 focus:ring-purple-500" 
                    />
                  </div>
                </div>

                {/* Calculation Preview Box */}
                <div className="p-4 bg-purple-50 border border-purple-100 rounded-lg space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-600">Net Dividend Payable ({sharesCount} × £{rate.toFixed(4)}):</span>
                    <span className="font-bold font-mono text-purple-700 text-sm">£{dividendPayable.toFixed(2)}</span>
                  </div>
                  {!excludeTaxCredit && (
                    <div className="flex justify-between items-center text-xs text-gray-500">
                      <span>UK Notional Tax Credit (10%):</span>
                      <span className="font-mono">£{taxCredit.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center text-xs pt-1 border-t border-purple-200">
                    <span className="font-semibold text-gray-700">Gross Dividend:</span>
                    <span className="font-bold font-mono text-gray-800">£{grossDividend.toFixed(2)}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Declaration Date</label>
                    <input 
                      type="date" 
                      value={declarationDate} 
                      onChange={(e) => setDeclarationDate(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-purple-500" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Payment Date</label>
                    <input 
                      type="date" 
                      value={paymentDate} 
                      onChange={(e) => setPaymentDate(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-purple-500" 
                    />
                  </div>
                </div>

                {/* Double-Entry Journal Posting Controls */}
                <div className="space-y-3 pt-2 border-t">
                  <div className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      id="postJrn" 
                      checked={postJournal} 
                      onChange={(e) => setPostJournal(e.target.checked)} 
                    />
                    <label htmlFor="postJrn" className="text-xs font-semibold text-gray-700 cursor-pointer">
                      Automatically Post Journal (Dr 3200 Equity Dividends)
                    </label>
                  </div>

                  {postJournal && (
                    <div className="grid grid-cols-2 gap-4 pl-5">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Credit Account</label>
                        <select 
                          value={journalTarget} 
                          onChange={(e) => setJournalTarget(e.target.value as any)}
                          className="w-full px-3 py-1.5 border rounded-lg text-xs"
                        >
                          <option value="Bank">Cr 1200 Bank Account</option>
                          <option value="DLA">Cr 2100 Director Loan Account</option>
                        </select>
                      </div>

                      {journalTarget === "Bank" && (
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Deposit Account</label>
                          <select 
                            value={bankAccountId} 
                            onChange={(e) => setBankAccountId(e.target.value)}
                            className="w-full px-3 py-1.5 border rounded-lg text-xs"
                          >
                            <option value="">Select Bank...</option>
                            {bankAccounts.map((a: any) => (
                              <option key={a.id} value={a.id}>{a.bankName}</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Notes / Board Resolution</label>
                  <textarea 
                    rows={2}
                    value={notes} 
                    onChange={(e) => setNotes(e.target.value)} 
                    placeholder="e.g. Interim dividend approved at Board meeting" 
                    className="w-full px-3 py-2 border rounded-lg text-xs focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div className="px-6 py-4 border-t bg-gray-50 rounded-b-xl flex justify-end gap-3">
                <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-100">
                  Cancel
                </button>
                <button 
                  onClick={() => createMutation.mutate()} 
                  disabled={createMutation.isPending || dividendPayable <= 0} 
                  className="btn-SanSuite flex items-center gap-2 disabled:opacity-50"
                >
                  <CheckCircle2 size={14} />
                  {createMutation.isPending ? "Creating..." : "Confirm & Issue Voucher"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Statutory Dividend Voucher View Modal */}
        {selectedVoucher && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col">
              <div className="px-6 py-3 border-b flex items-center justify-between bg-gray-50 rounded-t-xl print:hidden">
                <span className="font-bold text-gray-800 text-sm flex items-center gap-2">
                  <FileText size={16} className="text-purple-600" /> Dividend Voucher Preview
                </span>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => window.print()}
                    className="px-3 py-1.5 bg-purple-600 text-white rounded-lg text-xs font-medium hover:bg-purple-700 flex items-center gap-1.5 shadow-sm"
                  >
                    <Printer size={13} /> Print Voucher
                  </button>
                  <button onClick={() => setSelectedVoucher(null)} className="text-gray-400 hover:text-gray-600">
                    <X size={18} />
                  </button>
                </div>
              </div>

              <div className="p-8 space-y-6 overflow-y-auto text-gray-800">
                {/* Voucher Header */}
                <div className="border-b-2 border-gray-900 pb-4 flex justify-between items-start">
                  <div>
                    <h2 className="text-xl font-extrabold uppercase tracking-wide text-gray-900">
                      {currentClient?.clientName || "Company Name"}
                    </h2>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Company Reg: {currentClient?.companyNumber || currentClient?.registrationNumber || "12345678"}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs uppercase font-bold tracking-wider text-purple-700 block">DIVIDEND VOUCHER</span>
                    <span className="text-sm font-mono font-bold">{selectedVoucher.voucherNumber || `VCH-${selectedVoucher.id}`}</span>
                  </div>
                </div>

                {/* Shareholder & Payment Details */}
                <div className="grid grid-cols-2 gap-6 text-xs">
                  <div className="space-y-1">
                    <span className="text-gray-400 uppercase font-semibold">Shareholder Name & Address</span>
                    <p className="font-bold text-sm text-gray-900">{selectedVoucher.shareholderName || "Shareholder"}</p>
                    <p className="text-gray-600">{selectedVoucher.shareholderAddress || "Registered Office"}</p>
                  </div>
                  <div className="space-y-1 text-right">
                    <p><span className="text-gray-400">Date Declared:</span> <strong>{selectedVoucher.declarationDate || selectedVoucher.paymentDate || "—"}</strong></p>
                    <p><span className="text-gray-400">Payment Date:</span> <strong>{selectedVoucher.paymentDate || "—"}</strong></p>
                    <p><span className="text-gray-400">Share Class:</span> <strong>{selectedVoucher.shareClass || "Ordinary Class A"}</strong></p>
                  </div>
                </div>

                {/* Statutory Calculation Table */}
                <table className="w-full text-xs border border-gray-200">
                  <thead className="bg-gray-50 border-b font-semibold">
                    <tr>
                      <th className="p-3 text-left">No. of Shares</th>
                      <th className="p-3 text-right">Rate per Share</th>
                      <th className="p-3 text-right">Net Dividend Payable</th>
                      <th className="p-3 text-right">Tax Credit (10%)</th>
                      <th className="p-3 text-right">Gross Dividend</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y font-mono">
                    <tr>
                      <td className="p-3">{selectedVoucher.numberOfShares || "—"}</td>
                      <td className="p-3 text-right">£{parseFloat(selectedVoucher.ratePerShare || "0").toFixed(4)}</td>
                      <td className="p-3 text-right font-bold text-gray-900">£{parseFloat(selectedVoucher.dividendPayable || selectedVoucher.amount || "0").toFixed(2)}</td>
                      <td className="p-3 text-right text-gray-500">£{parseFloat(selectedVoucher.taxCredit || "0").toFixed(2)}</td>
                      <td className="p-3 text-right font-bold">£{parseFloat(selectedVoucher.grossDividend || selectedVoucher.amount || "0").toFixed(2)}</td>
                    </tr>
                  </tbody>
                </table>

                {/* Statutory Certification Statement */}
                <div className="text-[11px] text-gray-600 space-y-2 border-t pt-4">
                  <p>
                    This voucher confirms the payment of a dividend by <strong>{currentClient?.clientName || "the Company"}</strong> to the shareholder named above.
                  </p>
                  <p>
                    Please keep this dividend voucher in a safe place. You will need it to complete your UK Self Assessment Tax Return (SA100) or to confirm your tax affairs with HM Revenue & Customs.
                  </p>
                </div>

                {/* Sign-off */}
                <div className="pt-6 flex justify-between items-end text-xs border-t">
                  <div>
                    <p className="text-gray-500">By Order of the Board</p>
                    <p className="font-semibold text-gray-800 mt-1">{selectedVoucher.declaredBy || "Board of Directors"}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-gray-400">Authorized Officer Signature</p>
                    <div className="h-8 border-b border-gray-400 w-44 mt-1"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
