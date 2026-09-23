import { useState, useEffect, useMemo } from "react";
import { useLocation, useRoute } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AppLayout from "../../../components/layout/AppLayout";
import { bookkeepingSidebar, getClientSidebar } from "../sidebar";
import SettingsTabs from "../../../components/bookkeeping/SettingsTabs";
import { apiRequest } from "../../../lib/queryClient";
import { useToast } from "../../../hooks/useToast";
import {
  ChevronRight,
  Building2,
  Calendar,
  Save,
  Edit2,
  X,
  Sliders,
  Building,
} from "lucide-react";

export default function CompanyInfoPage() {
  const [match1, params1] = useRoute("/bookkeeping/:id/company-info");
  const [match2, params2] = useRoute("/bookkeeping/:id/settings");
  const [match3, params3] = useRoute("/bookkeeping/:id/*");
  const rawClientId = params1?.id || params2?.id || params3?.id || "";

  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch practice clients for client switcher
  const { data: clients = [] } = useQuery<any[]>({
    queryKey: ["/api/practice/clients"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/practice/clients");
      return res.ok ? res.json() : [];
    },
  });

  const effectiveClientId = useMemo(() => {
    if (rawClientId) return rawClientId;
    if (clients.length > 0) return String(clients[0].id);
    return "";
  }, [rawClientId, clients]);

  const activeClient = useMemo(() => {
    return clients.find((c: any) => String(c.id) === String(effectiveClientId));
  }, [clients, effectiveClientId]);

  const [companySubTab, setCompanySubTab] = useState<"info" | "preferences">("info");
  const [isEditCompanyModalOpen, setIsEditCompanyModalOpen] = useState(false);

  const { data: companyData } = useQuery({
    queryKey: [`/api/bookkeeping/settings/${effectiveClientId}/company-info`],
    queryFn: async () => {
      if (!effectiveClientId) return null;
      const res = await apiRequest("GET", `/api/bookkeeping/settings/${effectiveClientId}/company-info`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!effectiveClientId,
  });

  const companyInfo = companyData?.companyInfo || {};

  // Form State
  const [editForm, setEditForm] = useState<any>({});
  useEffect(() => {
    if (companyInfo.name || companyInfo.id) {
      setEditForm({
        name: companyInfo.name || "",
        type: companyInfo.type || "Limited",
        registrationNumber: companyInfo.registrationNumber || "",
        utrNumber: companyInfo.utrNumber || "",
        currency: companyInfo.currency || "Pound Sterling",
        businessStartDate: companyInfo.businessStartDate || "",
        bookStartDate: companyInfo.bookStartDate || "",
        yearEnd: companyInfo.yearEnd || "31/12",
        vatScheme: companyInfo.vatScheme || "Standard VAT Accrual Based",
        vatNumber: companyInfo.vatNumber || "",
        vatRegistrationDate: companyInfo.vatRegistrationDate || "",
        vatSubmitType: companyInfo.vatSubmitType || "Quarterly",
        address: companyInfo.address || "",
        city: companyInfo.city || "",
        county: companyInfo.county || "",
        postcode: companyInfo.postcode || "",
        country: companyInfo.country || "United Kingdom",
        phone: companyInfo.phone || "",
        email: companyInfo.email || "",
        website: companyInfo.website || "",
      });
    }
  }, [companyInfo]);

  const [prefForm, setPrefForm] = useState({
    manualBankReconciliation: false,
    useDocTemplate: true,
    defaultPagePeriod: "All",
  });
  useEffect(() => {
    if (companyData?.settingsPreferences) {
      setPrefForm({
        manualBankReconciliation: Boolean(companyData.settingsPreferences.manualBankReconciliation),
        useDocTemplate: Boolean(companyData.settingsPreferences.useDocTemplate),
        defaultPagePeriod: companyData.settingsPreferences.defaultPagePeriod || "All",
      });
    }
  }, [companyData]);

  const saveCompanyMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiRequest("POST", `/api/bookkeeping/settings/${effectiveClientId}/company-info`, payload);
      if (!res.ok) throw new Error("Failed to save company information");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/bookkeeping/settings/${effectiveClientId}/company-info`] });
      queryClient.invalidateQueries({ queryKey: ["/api/practice/clients"] });
      toast({ title: "Company Info Updated", description: "Company profile details saved successfully." });
      setIsEditCompanyModalOpen(false);
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const savePreferencesMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiRequest("POST", `/api/bookkeeping/settings/${effectiveClientId}/settings-preferences`, payload);
      if (!res.ok) throw new Error("Failed to save preferences");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/bookkeeping/settings/${effectiveClientId}/company-info`] });
      toast({ title: "Preferences Saved", description: "Bookkeeping preferences updated." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  return (
    <AppLayout
      sidebar={effectiveClientId ? getClientSidebar(effectiveClientId) : bookkeepingSidebar}
      module="Bookkeeping"
    >
      <div className="bg-slate-50 min-h-screen pb-16">
        {/* Navigation Breadcrumb & Client Switcher */}
        <div className="bg-white px-6 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-10 shadow-2xs">
          <div className="flex items-center text-xs text-slate-500 gap-2">
            <button
              type="button"
              onClick={() => navigate("/bookkeeping")}
              className="hover:text-purple-600 font-semibold transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Building2 size={13} />
              <span>Bookkeeping</span>
            </button>
            <ChevronRight size={13} className="text-slate-400" />
            <span className="text-slate-700 font-medium">Settings</span>
            <ChevronRight size={13} className="text-slate-400" />
            <span className="font-bold text-purple-700">Company Info</span>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
              <Building size={14} className="text-purple-600" />
              <span>Client:</span>
            </label>
            <select
              value={effectiveClientId}
              onChange={(e) => navigate(`/bookkeeping/${e.target.value}/company-info`)}
              className="border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-800 bg-white shadow-2xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
            >
              {clients.map((c: any) => (
                <option key={c.id} value={c.id}>
                  {c.clientName || c.companyName || `Client #${c.id}`} ({c.companyType || c.clientType || "Business"})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="p-6 w-full mx-auto space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-slate-900 tracking-tight">
                  Company Info & Settings
                </h1>
                {activeClient && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
                    {activeClient.clientName}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Manage legal corporate identity, financial year-end dates, VAT registration details, and bookkeeping preferences.
              </p>
            </div>
          </div>

          <SettingsTabs activeTab="company_info" clientId={effectiveClientId} />

          {/* Sub-tabs header */}
          <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
            <button
              type="button"
              onClick={() => setCompanySubTab("info")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${companySubTab === "info"
                  ? "bg-purple-600 text-white shadow-xs"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
            >
              <Building2 size={14} />
              <span>Company Information</span>
            </button>
            <button
              type="button"
              onClick={() => setCompanySubTab("preferences")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${companySubTab === "preferences"
                  ? "bg-purple-600 text-white shadow-xs"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
            >
              <Sliders size={14} />
              <span>General Preferences</span>
            </button>
          </div>

          {companySubTab === "info" ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Company Profile & Statutory Identifiers</h3>
                  <p className="text-xs text-slate-500">Official business profile, registration identifiers, and statutory taxation setup.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditCompanyModalOpen(true)}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Edit2 size={13} />
                  <span>Edit Company Info</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Card 1: Core Corporate Details */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
                  <div className="flex items-center gap-2 pb-3 border-b border-slate-100 text-purple-700 font-bold text-xs uppercase tracking-wider">
                    <Building2 size={16} />
                    <span>Corporate Identity</span>
                  </div>
                  <div className="space-y-3 text-xs">
                    <div>
                      <span className="text-slate-400 block font-medium">Company Legal Name</span>
                      <span className="font-bold text-slate-800 text-sm">{companyInfo.name || "-"}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-medium">Entity Type</span>
                      <span className="inline-block px-2.5 py-0.5 mt-0.5 rounded-md font-semibold text-purple-700 bg-purple-50 border border-purple-200">
                        {companyInfo.type || "Limited Company"}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-medium">Companies House Reg No.</span>
                      <span className="font-mono font-bold text-slate-800">{companyInfo.registrationNumber || "-"}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-medium">Unique Taxpayer Ref (UTR)</span>
                      <span className="font-mono font-bold text-slate-800">{companyInfo.utrNumber || "-"}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-medium">Functional Currency</span>
                      <span className="font-bold text-slate-800">{companyInfo.currency || "Pound Sterling (GBP £)"}</span>
                    </div>
                  </div>
                </div>

                {/* Card 2: Accounting & VAT */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
                  <div className="flex items-center gap-2 pb-3 border-b border-slate-100 text-emerald-700 font-bold text-xs uppercase tracking-wider">
                    <Calendar size={16} />
                    <span>Accounting & VAT</span>
                  </div>
                  <div className="space-y-3 text-xs">
                    <div>
                      <span className="text-slate-400 block font-medium">Financial Year End</span>
                      <span className="font-bold text-slate-800">{companyInfo.yearEnd || "31/12"}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-medium">Bookkeeping Start Date</span>
                      <span className="font-bold text-slate-800">{companyInfo.bookStartDate || "-"}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-medium">Business Incorporation Date</span>
                      <span className="font-bold text-slate-800">{companyInfo.businessStartDate || "-"}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-medium">VAT Accounting Scheme</span>
                      <span className="font-bold text-slate-800">{companyInfo.vatScheme || "Standard VAT Accrual Based"}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-medium">VAT Registration No.</span>
                      <span className="font-mono font-bold text-slate-800">{companyInfo.vatNumber || "Not Registered"}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-medium">VAT Filing Frequency</span>
                      <span className="font-bold text-slate-800">{companyInfo.vatSubmitType || "Quarterly"}</span>
                    </div>
                  </div>
                </div>

                {/* Card 3: Contact & Address */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
                  <div className="flex items-center gap-2 pb-3 border-b border-slate-100 text-indigo-700 font-bold text-xs uppercase tracking-wider">
                    <Building size={16} />
                    <span>Contact & Address</span>
                  </div>
                  <div className="space-y-3 text-xs">
                    <div>
                      <span className="text-slate-400 block font-medium">Registered Address</span>
                      <span className="font-medium text-slate-800 block">{companyInfo.address || "-"}</span>
                      {companyInfo.city && <span className="font-medium text-slate-700">{companyInfo.city}, </span>}
                      {companyInfo.county && <span className="font-medium text-slate-700">{companyInfo.county}, </span>}
                      <span className="font-bold text-slate-800 block">{companyInfo.postcode || ""}</span>
                      <span className="text-slate-500 block">{companyInfo.country || "United Kingdom"}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-medium">Telephone</span>
                      <span className="font-bold text-slate-800">{companyInfo.phone || "-"}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-medium">Primary Email</span>
                      <span className="font-bold text-purple-700">{companyInfo.email || "-"}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-medium">Website</span>
                      <span className="font-medium text-slate-800">{companyInfo.website || "-"}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Sub-tab 2: General Preferences */
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
              <div>
                <h3 className="text-sm font-bold text-slate-900">General Bookkeeping Preferences</h3>
                <p className="text-xs text-slate-500">Configure bank statement reconciliation behavior and template selection.</p>
              </div>

              <div className="divide-y divide-slate-100 space-y-4">
                <div className="pt-4 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <label className="text-xs font-bold text-slate-800">Manual Bank Reconciliation</label>
                    <p className="text-xs text-slate-500">
                      Allow manual matching and ledger ticking of bank transactions without automated bank feed rules.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setPrefForm((prev) => ({ ...prev, manualBankReconciliation: !prev.manualBankReconciliation }))
                    }
                    className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${prefForm.manualBankReconciliation ? "bg-purple-600" : "bg-slate-300"
                      }`}
                  >
                    <div
                      className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${prefForm.manualBankReconciliation ? "translate-x-5" : "translate-x-0"
                        }`}
                    />
                  </button>
                </div>

                <div className="pt-4 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <label className="text-xs font-bold text-slate-800">Use Document Template</label>
                    <p className="text-xs text-slate-500">
                      Automatically apply customized branded PDF templates to invoices, credit notes, and quotations.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPrefForm((prev) => ({ ...prev, useDocTemplate: !prev.useDocTemplate }))}
                    className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${prefForm.useDocTemplate ? "bg-purple-600" : "bg-slate-300"
                      }`}
                  >
                    <div
                      className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${prefForm.useDocTemplate ? "translate-x-5" : "translate-x-0"
                        }`}
                    />
                  </button>
                </div>

                <div className="pt-4 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <label className="text-xs font-bold text-slate-800">Default Page Period View</label>
                    <p className="text-xs text-slate-500">
                      Select the initial date filter applied when opening Sales, Purchases, and Bank lists.
                    </p>
                  </div>
                  <select
                    value={prefForm.defaultPagePeriod}
                    onChange={(e) => setPrefForm((prev) => ({ ...prev, defaultPagePeriod: e.target.value }))}
                    className="border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-800 bg-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  >
                    <option value="All">All Transactions</option>
                    <option value="Current Month">Current Month</option>
                    <option value="Current Quarter">Current Quarter</option>
                    <option value="Current Year">Current Accounting Year</option>
                    <option value="Last 30 Days">Last 30 Days</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end">
                <button
                  type="button"
                  disabled={savePreferencesMutation.isPending}
                  onClick={() => savePreferencesMutation.mutate(prefForm)}
                  className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs shadow-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                >
                  <Save size={14} />
                  <span>{savePreferencesMutation.isPending ? "Saving..." : "Save Preferences"}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Edit Company Info Modal */}
      {isEditCompanyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-2xl my-8 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 size={18} className="text-purple-600" />
                <h3 className="font-bold text-sm text-slate-900">Edit Company Information</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsEditCompanyModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                saveCompanyMutation.mutate(editForm);
              }}
              className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">Company Legal Name *</label>
                  <input
                    type="text"
                    required
                    value={editForm.name || ""}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Company Type</label>
                  <select
                    value={editForm.type || "Limited"}
                    onChange={(e) => setEditForm({ ...editForm, type: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  >
                    <option value="Limited">Limited Company</option>
                    <option value="LLP">Limited Liability Partnership (LLP)</option>
                    <option value="Sole Trader">Sole Trader / Individual</option>
                    <option value="Partnership">General Partnership</option>
                    <option value="Charity">Charity / Non-Profit</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Functional Currency</label>
                  <select
                    value={editForm.currency || "Pound Sterling"}
                    onChange={(e) => setEditForm({ ...editForm, currency: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  >
                    <option value="Pound Sterling">Pound Sterling (GBP £)</option>
                    <option value="Euro">Euro (EUR €)</option>
                    <option value="US Dollar">US Dollar (USD $)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Companies House Reg No.</label>
                  <input
                    type="text"
                    value={editForm.registrationNumber || ""}
                    onChange={(e) => setEditForm({ ...editForm, registrationNumber: e.target.value })}
                    placeholder="e.g. 12345678"
                    className="w-full font-mono border border-slate-300 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Unique Taxpayer Ref (UTR)</label>
                  <input
                    type="text"
                    value={editForm.utrNumber || ""}
                    onChange={(e) => setEditForm({ ...editForm, utrNumber: e.target.value })}
                    placeholder="10 digits"
                    className="w-full font-mono border border-slate-300 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Financial Year End</label>
                  <input
                    type="text"
                    value={editForm.yearEnd || "31/12"}
                    onChange={(e) => setEditForm({ ...editForm, yearEnd: e.target.value })}
                    placeholder="DD/MM (e.g. 31/12)"
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Bookkeeping Start Date</label>
                  <input
                    type="date"
                    value={editForm.bookStartDate || ""}
                    onChange={(e) => setEditForm({ ...editForm, bookStartDate: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">VAT Accounting Scheme</label>
                  <select
                    value={editForm.vatScheme || "Standard VAT Accrual Based"}
                    onChange={(e) => setEditForm({ ...editForm, vatScheme: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  >
                    <option value="Standard VAT Accrual Based">Standard VAT (Invoice Basis)</option>
                    <option value="Cash Accounting Scheme">Cash Accounting Scheme</option>
                    <option value="Flat Rate Scheme">Flat Rate Scheme (FRS)</option>
                    <option value="Not Registered">Not Registered</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">VAT Registration Number</label>
                  <input
                    type="text"
                    value={editForm.vatNumber || ""}
                    onChange={(e) => setEditForm({ ...editForm, vatNumber: e.target.value })}
                    placeholder="e.g. GB 123 4567 89"
                    className="w-full font-mono border border-slate-300 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">VAT Return Frequency</label>
                  <select
                    value={editForm.vatSubmitType || "Quarterly"}
                    onChange={(e) => setEditForm({ ...editForm, vatSubmitType: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  >
                    <option value="Quarterly">Quarterly</option>
                    <option value="Monthly">Monthly</option>
                    <option value="Annual">Annual Accounting</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Telephone</label>
                  <input
                    type="text"
                    value={editForm.phone || ""}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">Registered Street Address</label>
                  <input
                    type="text"
                    value={editForm.address || ""}
                    onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">City / Town</label>
                  <input
                    type="text"
                    value={editForm.city || ""}
                    onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Postcode</label>
                  <input
                    type="text"
                    value={editForm.postcode || ""}
                    onChange={(e) => setEditForm({ ...editForm, postcode: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={editForm.email || ""}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Website</label>
                  <input
                    type="text"
                    value={editForm.website || ""}
                    onChange={(e) => setEditForm({ ...editForm, website: e.target.value })}
                    placeholder="https://..."
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditCompanyModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saveCompanyMutation.isPending}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Save size={13} />
                  <span>{saveCompanyMutation.isPending ? "Saving..." : "Save Changes"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
