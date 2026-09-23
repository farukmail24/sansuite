import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import CharityWorkspaceLayout, { useCharityWorkspace } from "./CharityWorkspaceLayout";
import {
  Landmark, ArrowRightLeft, Receipt, ArrowDownRight, ArrowUpRight,
  Plus, Trash2, Users, FileText, CheckCircle2, AlertCircle,
  Building2, Calendar, Phone, Mail, MapPin, Search, Filter, X
} from "lucide-react";
import { apiRequest } from "../../../lib/queryClient";
import { useToast } from "../../../hooks/useToast";

export default function CharityBookkeepingPage() {
  return (
    <CharityWorkspaceLayout activeTab="bookkeeping">
      <CharityBookkeepingContent />
    </CharityWorkspaceLayout>
  );
}

function CharityBookkeepingContent() {
  const { charityId, charity } = useCharityWorkspace();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<"banks" | "invoices" | "bills" | "contacts">("banks");

  // Modals state
  const [isAddBankModalOpen, setIsAddBankModalOpen] = useState(false);
  const [isBankTransferModalOpen, setIsBankTransferModalOpen] = useState(false);
  const [isAddInvoiceModalOpen, setIsAddInvoiceModalOpen] = useState(false);
  const [isAddBillModalOpen, setIsAddBillModalOpen] = useState(false);
  const [isAddContactModalOpen, setIsAddContactModalOpen] = useState(false);

  // Forms
  const [bankForm, setBankForm] = useState({
    accountName: "",
    accountCode: "",
    accountType: "Current Account",
    accountNumber: "",
    sortCode: "",
    fundId: "",
    currentBalance: "0.00",
  });

  const [transferForm, setTransferForm] = useState({
    fromBankId: "",
    toBankId: "",
    fromFundId: "",
    toFundId: "",
    amount: "",
    reference: "",
    transferDate: new Date().toISOString().split("T")[0],
  });

  const [invoiceForm, setInvoiceForm] = useState({
    invoiceNumber: "",
    customerName: "",
    invoiceDate: new Date().toISOString().split("T")[0],
    dueDate: "",
    fundId: "",
    activityId: "",
    amount: "",
    status: "Paid",
    notes: "",
  });

  const [billForm, setBillForm] = useState({
    billNumber: "",
    supplierName: "",
    billDate: new Date().toISOString().split("T")[0],
    dueDate: "",
    fundId: "",
    activityId: "",
    amount: "",
    status: "Paid",
    notes: "",
  });

  const [contactForm, setContactForm] = useState({
    contactType: "Trustee",
    contactPerson: "",
    role: "",
    phone: "",
    mobile: "",
    email: "",
    website: "",
    address: "",
  });

  // Queries
  const { data: bankAccounts = [], isLoading: isLoadingBanks, refetch: refetchBanks } = useQuery<any[]>({
    queryKey: [`/api/charity/${charityId}/banks`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/charity/${charityId}/banks`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!charityId,
  });

  const { data: invoices = [], isLoading: isLoadingInvoices, refetch: refetchInvoices } = useQuery<any[]>({
    queryKey: [`/api/charity/${charityId}/invoices`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/charity/${charityId}/invoices`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!charityId,
  });

  const { data: bills = [], isLoading: isLoadingBills, refetch: refetchBills } = useQuery<any[]>({
    queryKey: [`/api/charity/${charityId}/bills`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/charity/${charityId}/bills`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!charityId,
  });

  const { data: contacts = [], isLoading: isLoadingContacts, refetch: refetchContacts } = useQuery<any[]>({
    queryKey: [`/api/charity/${charityId}/contacts`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/charity/${charityId}/contacts`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!charityId,
  });

  const { data: fundsData } = useQuery({
    queryKey: [`/api/charity/${charityId}/funds`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/charity/${charityId}/funds`);
      if (!res.ok) return { funds: [] };
      return res.json();
    },
    enabled: !!charityId,
  });
  const funds = fundsData?.funds || [];

  const { data: activities = [] } = useQuery<any[]>({
    queryKey: [`/api/charity/${charityId}/activities`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/charity/${charityId}/activities`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!charityId,
  });

  // Mutations
  const addBankMutation = useMutation({
    mutationFn: async () => {
      if (!bankForm.accountName.trim()) throw new Error("Account name is required");
      const res = await apiRequest("POST", `/api/charity/${charityId}/banks`, bankForm);
      if (!res.ok) throw new Error("Failed to create bank account");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Bank Account Added", description: "Account registered and linked to fund." });
      setIsAddBankModalOpen(false);
      setBankForm({ accountName: "", accountCode: "", accountType: "Current Account", accountNumber: "", sortCode: "", fundId: "", currentBalance: "0.00" });
      refetchBanks();
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const bankTransferMutation = useMutation({
    mutationFn: async () => {
      if (!transferForm.fromBankId || !transferForm.toBankId || !transferForm.amount) {
        throw new Error("Source bank, destination bank, and amount are required");
      }
      const res = await apiRequest("POST", `/api/charity/${charityId}/bank-transfers`, transferForm);
      if (!res.ok) throw new Error("Failed to complete bank transfer");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Transfer Complete", description: "Funds transferred between accounts." });
      setIsBankTransferModalOpen(false);
      setTransferForm({ fromBankId: "", toBankId: "", fromFundId: "", toFundId: "", amount: "", reference: "", transferDate: new Date().toISOString().split("T")[0] });
      refetchBanks();
      queryClient.invalidateQueries({ queryKey: [`/api/charity/${charityId}/funds`] });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteBankMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/charity/${charityId}/banks/${id}`);
      if (!res.ok) throw new Error("Failed to delete bank account");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Account Deleted", description: "Bank account removed." });
      refetchBanks();
    },
  });

  const addInvoiceMutation = useMutation({
    mutationFn: async () => {
      if (!invoiceForm.customerName.trim() || !invoiceForm.amount) throw new Error("Customer name and amount are required");
      const res = await apiRequest("POST", `/api/charity/${charityId}/invoices`, invoiceForm);
      if (!res.ok) throw new Error("Failed to record invoice");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Invoice Created", description: "Income transaction recorded." });
      setIsAddInvoiceModalOpen(false);
      setInvoiceForm({ invoiceNumber: "", customerName: "", invoiceDate: new Date().toISOString().split("T")[0], dueDate: "", fundId: "", activityId: "", amount: "", status: "Paid", notes: "" });
      refetchInvoices();
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteInvoiceMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/charity/${charityId}/invoices/${id}`);
      if (!res.ok) throw new Error("Failed to delete invoice");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Deleted", description: "Invoice removed." });
      refetchInvoices();
    },
  });

  const addBillMutation = useMutation({
    mutationFn: async () => {
      if (!billForm.supplierName.trim() || !billForm.amount) throw new Error("Supplier name and amount are required");
      const res = await apiRequest("POST", `/api/charity/${charityId}/bills`, billForm);
      if (!res.ok) throw new Error("Failed to record bill");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Bill Created", description: "Expenditure transaction recorded." });
      setIsAddBillModalOpen(false);
      setBillForm({ billNumber: "", supplierName: "", billDate: new Date().toISOString().split("T")[0], dueDate: "", fundId: "", activityId: "", amount: "", status: "Paid", notes: "" });
      refetchBills();
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteBillMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/charity/${charityId}/bills/${id}`);
      if (!res.ok) throw new Error("Failed to delete bill");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Deleted", description: "Bill removed." });
      refetchBills();
    },
  });

  const addContactMutation = useMutation({
    mutationFn: async () => {
      if (!contactForm.contactPerson.trim()) throw new Error("Contact name is required");
      const res = await apiRequest("POST", `/api/charity/${charityId}/contacts`, contactForm);
      if (!res.ok) throw new Error("Failed to add contact");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Contact Added", description: "Contact saved to directory." });
      setIsAddContactModalOpen(false);
      setContactForm({ contactType: "Trustee", contactPerson: "", role: "", phone: "", mobile: "", email: "", website: "", address: "" });
      refetchContacts();
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteContactMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/charity/${charityId}/contacts/${id}`);
      if (!res.ok) throw new Error("Failed to delete contact");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Deleted", description: "Contact removed." });
      refetchContacts();
    },
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Charity Bookkeeping & Banking</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage fund-linked bank accounts, inter-bank transfers, daily invoices, bills, and contacts.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {activeTab === "banks" && (
            <>
              <button
                onClick={() => setIsBankTransferModalOpen(true)}
                disabled={bankAccounts.length < 2}
                className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 shadow-xs transition-colors disabled:opacity-40 cursor-pointer"
              >
                <ArrowRightLeft size={14} /> Bank Transfer
              </button>
              <button
                onClick={() => setIsAddBankModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-orange-600 hover:bg-orange-700 rounded-lg shadow-sm transition-colors cursor-pointer"
              >
                <Plus size={14} /> Add Bank Account
              </button>
            </>
          )}
          {activeTab === "invoices" && (
            <button
              onClick={() => setIsAddInvoiceModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              <Plus size={14} /> New Invoice
            </button>
          )}
          {activeTab === "bills" && (
            <button
              onClick={() => setIsAddBillModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              <Plus size={14} /> New Bill
            </button>
          )}
          {activeTab === "contacts" && (
            <button
              onClick={() => setIsAddContactModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-orange-600 hover:bg-orange-700 rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              <Plus size={14} /> Add Contact
            </button>
          )}
        </div>
      </div>

      {/* Sub-Tabs */}
      <div className="flex space-x-1 border-b border-slate-200 overflow-x-auto">
        {[
          { id: "banks", label: "Bank Accounts & Transfers", icon: <Landmark size={14} />, count: bankAccounts.length },
          { id: "invoices", label: "Income (Invoices)", icon: <ArrowDownRight size={14} className="text-emerald-600" />, count: invoices.length },
          { id: "bills", label: "Expenditure (Bills)", icon: <ArrowUpRight size={14} className="text-rose-600" />, count: bills.length },
          { id: "contacts", label: "Contacts Directory", icon: <Users size={14} />, count: contacts.length },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium border-b-2 -mb-px transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === tab.id
                ? "border-orange-600 text-orange-600 font-semibold"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-100 text-slate-600 font-mono">
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* 1. BANK ACCOUNTS TAB */}
      {activeTab === "banks" && (
        <div className="space-y-4">
          <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-3 flex items-start gap-3">
            <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-800">
              <span className="font-semibold">Fund Allocation Mandate (July 2025 Update):</span> Every charity bank account must be linked to a specific charity fund. Transfers between bank accounts automatically mirror inter-fund reconciliations if distinct funds are specified.
            </div>
          </div>

          {bankAccounts.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center mx-auto mb-3">
                <Landmark size={24} />
              </div>
              <h3 className="text-sm font-bold text-slate-800">No Bank Accounts Configured</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
                Add your charity current account, deposit account, or petty cash fund to record bank balances.
              </p>
              <button
                onClick={() => setIsAddBankModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors cursor-pointer"
              >
                <Plus size={14} /> Add First Bank Account
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {bankAccounts.map((b: any) => (
                <div key={b.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-colors">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md bg-slate-100 text-slate-700">
                          {b.accountType}
                        </span>
                        <h4 className="text-base font-bold text-slate-900 mt-1">{b.accountName}</h4>
                      </div>
                      <button
                        onClick={() => deleteBankMutation.mutate(b.id)}
                        className="text-slate-400 hover:text-rose-600 p-1 transition-colors cursor-pointer"
                        title="Delete Bank Account"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>

                    <div className="space-y-1 text-xs text-slate-600">
                      {b.sortCode && (
                        <div className="flex justify-between font-mono">
                          <span className="text-slate-400">Sort Code:</span>
                          <span className="font-semibold">{b.sortCode}</span>
                        </div>
                      )}
                      {b.accountNumber && (
                        <div className="flex justify-between font-mono">
                          <span className="text-slate-400">Account No:</span>
                          <span className="font-semibold">{b.accountNumber}</span>
                        </div>
                      )}
                      <div className="flex justify-between items-center pt-1 border-t border-slate-100">
                        <span className="text-slate-400">Linked Fund:</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-50 text-orange-700 border border-orange-200">
                          {b.fundName || "Unrestricted General"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs text-slate-500 font-medium">Balance</span>
                    <span className="text-lg font-bold font-mono text-slate-900">
                      £{parseFloat(b.currentBalance || "0").toLocaleString("en-GB", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 2. INVOICES TAB */}
      {activeTab === "invoices" && (
        <div className="space-y-4">
          {invoices.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                <Receipt size={24} />
              </div>
              <h3 className="text-sm font-bold text-slate-800">No Invoices Recorded</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
                Record day-to-day charity sales, grants receivable, contracts, and educational fee income.
              </p>
              <button
                onClick={() => setIsAddInvoiceModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors cursor-pointer"
              >
                <Plus size={14} /> Create Charity Invoice
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold text-[10px] tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Invoice #</th>
                    <th className="px-4 py-3">Customer / Funder</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Linked Fund</th>
                    <th className="px-4 py-3">Activity</th>
                    <th className="px-4 py-3 text-right">Amount (£)</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invoices.map((inv: any) => (
                    <tr key={inv.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-mono font-bold text-slate-900">{inv.invoiceNumber}</td>
                      <td className="px-4 py-3 font-semibold text-slate-800">{inv.customerName}</td>
                      <td className="px-4 py-3 font-mono text-slate-600">{inv.invoiceDate}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-orange-50 text-orange-700 border border-orange-200">
                          {inv.fundName || "General Fund"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{inv.activityName || "—"}</td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">
                        £{parseFloat(inv.amount || "0").toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          inv.status === "Paid"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-amber-50 text-amber-700 border border-amber-200"
                        }`}>
                          {inv.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => deleteInvoiceMutation.mutate(inv.id)}
                          className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 3. BILLS TAB */}
      {activeTab === "bills" && (
        <div className="space-y-4">
          {bills.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-3">
                <FileText size={24} />
              </div>
              <h3 className="text-sm font-bold text-slate-800">No Bills Recorded</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
                Track supplier invoices, rent, utilities, project costs, and operational expenditure.
              </p>
              <button
                onClick={() => setIsAddBillModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors cursor-pointer"
              >
                <Plus size={14} /> Create Charity Bill
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold text-[10px] tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Bill #</th>
                    <th className="px-4 py-3">Supplier</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Linked Fund</th>
                    <th className="px-4 py-3">Activity</th>
                    <th className="px-4 py-3 text-right">Amount (£)</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {bills.map((b: any) => (
                    <tr key={b.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-mono font-bold text-slate-900">{b.billNumber}</td>
                      <td className="px-4 py-3 font-semibold text-slate-800">{b.supplierName}</td>
                      <td className="px-4 py-3 font-mono text-slate-600">{b.billDate}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-orange-50 text-orange-700 border border-orange-200">
                          {b.fundName || "General Fund"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{b.activityName || "—"}</td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-rose-600">
                        £{parseFloat(b.amount || "0").toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          b.status === "Paid"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-amber-50 text-amber-700 border border-amber-200"
                        }`}>
                          {b.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => deleteBillMutation.mutate(b.id)}
                          className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 4. CONTACTS TAB */}
      {activeTab === "contacts" && (
        <div className="space-y-4">
          {contacts.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center mx-auto mb-3">
                <Users size={24} />
              </div>
              <h3 className="text-sm font-bold text-slate-800">No Contacts Recorded</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
                Maintain directory of Trustees, Donors, Suppliers, Bankers, and Independent Examiners.
              </p>
              <button
                onClick={() => setIsAddContactModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors cursor-pointer"
              >
                <Plus size={14} /> Add First Contact
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {contacts.map((c: any) => (
                <div key={c.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-colors">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-orange-50 text-orange-700 border border-orange-200">
                        {c.contactType}
                      </span>
                      <button
                        onClick={() => deleteContactMutation.mutate(c.id)}
                        className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    <h4 className="text-sm font-bold text-slate-900">{c.contactPerson}</h4>
                    {c.role && <p className="text-xs text-slate-500 font-medium">{c.role}</p>}

                    <div className="space-y-1 text-xs text-slate-600 pt-2 border-t border-slate-100">
                      {c.email && (
                        <div className="flex items-center gap-2">
                          <Mail size={12} className="text-slate-400 shrink-0" />
                          <span className="truncate">{c.email}</span>
                        </div>
                      )}
                      {(c.phone || c.mobile) && (
                        <div className="flex items-center gap-2 font-mono">
                          <Phone size={12} className="text-slate-400 shrink-0" />
                          <span>{c.phone || c.mobile}</span>
                        </div>
                      )}
                      {c.address && (
                        <div className="flex items-start gap-2">
                          <MapPin size={12} className="text-slate-400 shrink-0 mt-0.5" />
                          <span className="text-[11px] text-slate-500 line-clamp-2">{c.address}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ADD BANK MODAL */}
      {isAddBankModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-slate-900">Add Bank Account</h3>
              <button onClick={() => setIsAddBankModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
                <X size={16} />
              </button>
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Account Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Barclays Current Account"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500"
                  value={bankForm.accountName}
                  onChange={(e) => setBankForm({ ...bankForm, accountName: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Account Type</label>
                  <select
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500 bg-white"
                    value={bankForm.accountType}
                    onChange={(e) => setBankForm({ ...bankForm, accountType: e.target.value })}
                  >
                    <option value="Current Account">Current Account</option>
                    <option value="Savings Account">Savings Account</option>
                    <option value="Petty Cash">Petty Cash</option>
                    <option value="Credit Card">Credit Card</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Account Code</label>
                  <input
                    type="text"
                    placeholder="e.g. 1200"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500 font-mono"
                    value={bankForm.accountCode}
                    onChange={(e) => setBankForm({ ...bankForm, accountCode: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Sort Code</label>
                  <input
                    type="text"
                    placeholder="20-00-00"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500 font-mono"
                    value={bankForm.sortCode}
                    onChange={(e) => setBankForm({ ...bankForm, sortCode: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Account Number</label>
                  <input
                    type="text"
                    placeholder="12345678"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500 font-mono"
                    value={bankForm.accountNumber}
                    onChange={(e) => setBankForm({ ...bankForm, accountNumber: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Linked Charity Fund *</label>
                <select
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500 bg-white"
                  value={bankForm.fundId}
                  onChange={(e) => setBankForm({ ...bankForm, fundId: e.target.value })}
                >
                  <option value="">Select Fund</option>
                  {funds.map((f: any) => (
                    <option key={f.id} value={f.id}>{f.fundName} ({f.fundType})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Opening Balance (£)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500 font-mono"
                  value={bankForm.currentBalance}
                  onChange={(e) => setBankForm({ ...bankForm, currentBalance: e.target.value })}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button onClick={() => setIsAddBankModalOpen(false)} className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800 cursor-pointer">
                Cancel
              </button>
              <button
                onClick={() => addBankMutation.mutate()}
                disabled={addBankMutation.isPending}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-orange-600 hover:bg-orange-700 rounded-lg shadow-sm cursor-pointer disabled:opacity-50"
              >
                {addBankMutation.isPending ? "Saving..." : "Save Account"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BANK TRANSFER MODAL */}
      {isBankTransferModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-slate-900">Transfer Funds Between Accounts</h3>
              <button onClick={() => setIsBankTransferModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
                <X size={16} />
              </button>
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">From Bank Account *</label>
                <select
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500 bg-white"
                  value={transferForm.fromBankId}
                  onChange={(e) => {
                    const sel = bankAccounts.find((b: any) => b.id.toString() === e.target.value);
                    setTransferForm({
                      ...transferForm,
                      fromBankId: e.target.value,
                      fromFundId: sel?.fundId ? sel.fundId.toString() : "",
                    });
                  }}
                >
                  <option value="">Select Source Bank</option>
                  {bankAccounts.map((b: any) => (
                    <option key={b.id} value={b.id}>{b.accountName} (Bal: £{parseFloat(b.currentBalance || "0").toFixed(2)})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">To Bank Account *</label>
                <select
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500 bg-white"
                  value={transferForm.toBankId}
                  onChange={(e) => {
                    const sel = bankAccounts.find((b: any) => b.id.toString() === e.target.value);
                    setTransferForm({
                      ...transferForm,
                      toBankId: e.target.value,
                      toFundId: sel?.fundId ? sel.fundId.toString() : "",
                    });
                  }}
                >
                  <option value="">Select Destination Bank</option>
                  {bankAccounts.filter((b: any) => b.id.toString() !== transferForm.fromBankId).map((b: any) => (
                    <option key={b.id} value={b.id}>{b.accountName} (Bal: £{parseFloat(b.currentBalance || "0").toFixed(2)})</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Amount (£) *</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500 font-mono"
                    value={transferForm.amount}
                    onChange={(e) => setTransferForm({ ...transferForm, amount: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Date</label>
                  <input
                    type="date"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500 font-mono"
                    value={transferForm.transferDate}
                    onChange={(e) => setTransferForm({ ...transferForm, transferDate: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Reference / Reason</label>
                <input
                  type="text"
                  placeholder="e.g. Operational funds transfer"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500"
                  value={transferForm.reference}
                  onChange={(e) => setTransferForm({ ...transferForm, reference: e.target.value })}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button onClick={() => setIsBankTransferModalOpen(false)} className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800 cursor-pointer">
                Cancel
              </button>
              <button
                onClick={() => bankTransferMutation.mutate()}
                disabled={bankTransferMutation.isPending}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-orange-600 hover:bg-orange-700 rounded-lg shadow-sm cursor-pointer disabled:opacity-50"
              >
                {bankTransferMutation.isPending ? "Transferring..." : "Execute Transfer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD INVOICE MODAL */}
      {isAddInvoiceModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-slate-900">New Charity Invoice</h3>
              <button onClick={() => setIsAddInvoiceModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
                <X size={16} />
              </button>
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Customer / Organization Name *</label>
                <input
                  type="text"
                  placeholder="e.g. National Lottery Community Fund"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
                  value={invoiceForm.customerName}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, customerName: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Invoice Number</label>
                  <input
                    type="text"
                    placeholder="INV-001"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500 font-mono"
                    value={invoiceForm.invoiceNumber}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, invoiceNumber: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Amount (£) *</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500 font-mono"
                    value={invoiceForm.amount}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, amount: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Invoice Date</label>
                  <input
                    type="date"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500 font-mono"
                    value={invoiceForm.invoiceDate}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, invoiceDate: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Due Date</label>
                  <input
                    type="date"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500 font-mono"
                    value={invoiceForm.dueDate}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, dueDate: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Linked Fund</label>
                  <select
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500 bg-white"
                    value={invoiceForm.fundId}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, fundId: e.target.value })}
                  >
                    <option value="">Select Fund</option>
                    {funds.map((f: any) => (
                      <option key={f.id} value={f.id}>{f.fundName}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Charity Activity</label>
                  <select
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500 bg-white"
                    value={invoiceForm.activityId}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, activityId: e.target.value })}
                  >
                    <option value="">Select Activity</option>
                    {activities.map((a: any) => (
                      <option key={a.id} value={a.id}>{a.activityName}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Description / Notes</label>
                <textarea
                  rows={2}
                  placeholder="Notes or grant reference..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
                  value={invoiceForm.notes}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, notes: e.target.value })}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button onClick={() => setIsAddInvoiceModalOpen(false)} className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800 cursor-pointer">
                Cancel
              </button>
              <button
                onClick={() => addInvoiceMutation.mutate()}
                disabled={addInvoiceMutation.isPending}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm cursor-pointer disabled:opacity-50"
              >
                {addInvoiceMutation.isPending ? "Saving..." : "Record Invoice"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD BILL MODAL */}
      {isAddBillModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-slate-900">New Charity Bill</h3>
              <button onClick={() => setIsAddBillModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
                <X size={16} />
              </button>
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Supplier Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Community Hall Rentals Ltd"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-rose-500"
                  value={billForm.supplierName}
                  onChange={(e) => setBillForm({ ...billForm, supplierName: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Bill Number</label>
                  <input
                    type="text"
                    placeholder="BILL-001"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-rose-500 font-mono"
                    value={billForm.billNumber}
                    onChange={(e) => setBillForm({ ...billForm, billNumber: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Amount (£) *</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-rose-500 font-mono"
                    value={billForm.amount}
                    onChange={(e) => setBillForm({ ...billForm, amount: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Bill Date</label>
                  <input
                    type="date"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-rose-500 font-mono"
                    value={billForm.billDate}
                    onChange={(e) => setBillForm({ ...billForm, billDate: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Due Date</label>
                  <input
                    type="date"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-rose-500 font-mono"
                    value={billForm.dueDate}
                    onChange={(e) => setBillForm({ ...billForm, dueDate: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Charged To Fund</label>
                  <select
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-rose-500 bg-white"
                    value={billForm.fundId}
                    onChange={(e) => setBillForm({ ...billForm, fundId: e.target.value })}
                  >
                    <option value="">Select Fund</option>
                    {funds.map((f: any) => (
                      <option key={f.id} value={f.id}>{f.fundName}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Activity</label>
                  <select
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-rose-500 bg-white"
                    value={billForm.activityId}
                    onChange={(e) => setBillForm({ ...billForm, activityId: e.target.value })}
                  >
                    <option value="">Select Activity</option>
                    {activities.map((a: any) => (
                      <option key={a.id} value={a.id}>{a.activityName}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Notes / Item Details</label>
                <textarea
                  rows={2}
                  placeholder="Details of expense..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-rose-500"
                  value={billForm.notes}
                  onChange={(e) => setBillForm({ ...billForm, notes: e.target.value })}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button onClick={() => setIsAddBillModalOpen(false)} className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800 cursor-pointer">
                Cancel
              </button>
              <button
                onClick={() => addBillMutation.mutate()}
                disabled={addBillMutation.isPending}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm cursor-pointer disabled:opacity-50"
              >
                {addBillMutation.isPending ? "Saving..." : "Record Bill"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD CONTACT MODAL */}
      {isAddContactModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-slate-900">Add Contact to Directory</h3>
              <button onClick={() => setIsAddContactModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
                <X size={16} />
              </button>
            </div>
            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Contact Type *</label>
                  <select
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500 bg-white"
                    value={contactForm.contactType}
                    onChange={(e) => setContactForm({ ...contactForm, contactType: e.target.value })}
                  >
                    <option value="Trustee">Trustee</option>
                    <option value="Patron">Patron</option>
                    <option value="Donor">Donor</option>
                    <option value="Customer">Customer</option>
                    <option value="Supplier">Supplier</option>
                    <option value="Banker">Banker</option>
                    <option value="Solicitor">Solicitor</option>
                    <option value="Examiner">Independent Examiner</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Role / Designation</label>
                  <input
                    type="text"
                    placeholder="e.g. Chair of Trustees"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500"
                    value={contactForm.role}
                    onChange={(e) => setContactForm({ ...contactForm, role: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Full Name / Organization *</label>
                <input
                  type="text"
                  placeholder="e.g. Dr Sarah Jenkins"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500"
                  value={contactForm.contactPerson}
                  onChange={(e) => setContactForm({ ...contactForm, contactPerson: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    placeholder="sarah@example.org"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500"
                    value={contactForm.email}
                    onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Phone</label>
                  <input
                    type="text"
                    placeholder="07123 456789"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500 font-mono"
                    value={contactForm.phone}
                    onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Address</label>
                <textarea
                  rows={2}
                  placeholder="Postal address..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500"
                  value={contactForm.address}
                  onChange={(e) => setContactForm({ ...contactForm, address: e.target.value })}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button onClick={() => setIsAddContactModalOpen(false)} className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800 cursor-pointer">
                Cancel
              </button>
              <button
                onClick={() => addContactMutation.mutate()}
                disabled={addContactMutation.isPending}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-orange-600 hover:bg-orange-700 rounded-lg shadow-sm cursor-pointer disabled:opacity-50"
              >
                {addContactMutation.isPending ? "Saving..." : "Save Contact"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
