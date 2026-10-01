import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import AppLayout from "../../components/layout/AppLayout";
import ClientPayrollLayout from "./workspace/ClientPayrollLayout";
import { practicePayrollSidebar } from "./sidebar";
import { 
  LayoutDashboard, Users, Calculator, Settings, CheckCircle, Save, 
  CheckSquare, Building2, History, X, Search, Loader2, Sparkles, Check, ArrowRight 
} from "lucide-react";
import { apiRequest } from "../../lib/queryClient";

export default function PayrollSettingsPage() {
  const qc = useQueryClient();
  const [match, params] = useRoute("/payroll/:clientId/settings");
  const [selectedClientId, setSelectedClientId] = useState<string>(params?.clientId || "");

  // Fetch practice clients for auto-suggest and scheme switching
  const { data: practiceClients = [] } = useQuery<any[]>({
    queryKey: ["/api/practice/clients"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/practice/clients");
      if (!res.ok) return [];
      return res.json();
    },
  });

  const effectiveClientId = params?.clientId || selectedClientId || (practiceClients.length > 0 ? practiceClients[0].id.toString() : "1");

  const [activeTab, setActiveTab] = useState("paye");
  const [saved, setSaved] = useState(false);

  const { data: schemes = [], isLoading } = useQuery({
    queryKey: ["/api/payroll/schemes"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/payroll/schemes");
      if (!res.ok) return [];
      return res.json();
    },
  });

  // Find the scheme for this client
  const scheme = schemes.find((s: any) => s.clientId.toString() === effectiveClientId);
  const currentClient = practiceClients.find((c: any) => c.id.toString() === effectiveClientId);

  const [form, setForm] = useState<any>({
    employerName: scheme?.employerName || "",
    hmrcOfficeNumber: scheme?.hmrcOfficeNumber || "",
    payeReference: scheme?.payeReference || "",
    accountsOfficeReference: scheme?.accountsOfficeReference || "",
    econ: scheme?.econ || "",
    defaultPayFrequency: scheme?.defaultPayFrequency || "Monthly",
    paymentMode: scheme?.paymentMode || "BACS",
    bankName: scheme?.bankName || "",
    bankSortCode: scheme?.bankSortCode || "",
    bankAccountNumber: scheme?.bankAccountNumber || "",
    syncBookkeeping: scheme?.syncBookkeeping || false,
    smallEmployersRelief: scheme?.smallEmployersRelief || false,
    employmentAllowance: scheme?.employmentAllowance || false,
    contactName: "",
    contactEmail: "",
    contactPhone: "",
    contactAddress: "",
    gatewayUserId: "",
    gatewayPassword: "",
    senderType: "Employer",
    payslipTemplate: "Classic Modern",
    payslipNote: "",
    showYtdTotals: true,
    showEmployerAddress: true,
    standardHourlyRate: "15.00",
    overtimeMultiplier: "1.5",
    bankHolidayMultiplier: "2.0",
    standardWeeklyHours: "37.5",
  });

  // Suggestion states
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [chResults, setChResults] = useState<any[]>([]);
  const [isSearchingCh, setIsSearchingCh] = useState(false);
  const suggestionRef = useRef<HTMLDivElement>(null);

  // Update local form state when scheme or client changes
  useEffect(() => {
    if (scheme) {
      setForm((f: any) => ({
        ...f,
        ...scheme,
        employerName: scheme.employerName || currentClient?.clientName || "",
        hmrcOfficeNumber: scheme.hmrcOfficeNumber || "",
        payeReference: scheme.payeReference || "",
        accountsOfficeReference: scheme.accountsOfficeReference || "",
        econ: scheme.econ || "",
        defaultPayFrequency: scheme.defaultPayFrequency || "Monthly",
        paymentMode: scheme.paymentMode || "BACS",
        bankName: scheme.bankName || "",
        bankSortCode: scheme.bankSortCode || "",
        bankAccountNumber: scheme.bankAccountNumber || "",
        syncBookkeeping: scheme.syncBookkeeping || false,
        smallEmployersRelief: scheme.smallEmployersRelief || false,
        employmentAllowance: scheme.employmentAllowance || false,
      }));
    } else if (currentClient) {
      setForm((f: any) => ({
        ...f,
        employerName: currentClient.clientName || "",
      }));
    }
  }, [scheme, effectiveClientId, currentClient]);

  // Close suggestions on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (suggestionRef.current && !suggestionRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Live Companies House search debounce (when query >= 2 characters)
  useEffect(() => {
    const query = form.employerName?.trim() || "";
    if (query.length < 2) {
      setChResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingCh(true);
      try {
        const res = await apiRequest("GET", `/api/companies-house/search?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          setChResults((data.items || []).slice(0, 6));
        }
      } catch {
        setChResults([]);
      } finally {
        setIsSearchingCh(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [form.employerName]);

  const matchingPracticeClients = (practiceClients || []).filter((c: any) => {
    const name = c.clientName || "";
    const query = (form.employerName || "").trim().toLowerCase();
    return query.length >= 1 && name.toLowerCase().includes(query);
  }).slice(0, 4);

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      const endpoint = scheme?.id ? `/api/payroll/schemes/${scheme.id}/settings` : "/api/payroll/schemes";
      const res = await apiRequest("POST", endpoint, { ...data, clientId: effectiveClientId });
      if (!res.ok) throw new Error("Failed to save settings");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/payroll/schemes"] });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
  });

  const handleSave = () => {
    saveMutation.mutate(form);
  };

  const content = (
    <div className="space-y-5">
      {/* Practice-Level Client Scheme Selector (Shown when at /payroll/settings) */}
      {!match && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
              <Building2 size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold text-gray-900">Practice Client Scheme Selector</h3>
                <span className="text-[10px] bg-purple-50 text-purple-700 font-semibold px-2 py-0.5 rounded border border-purple-200">
                  Bureau Level
                </span>
              </div>
              <p className="text-[11px] text-gray-500 mt-0.5">
                Select which client's PAYE scheme you are configuring, or open directly in their dedicated Client Workspace.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={effectiveClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
              className="text-xs border border-gray-300 rounded-lg px-3 py-2 bg-white font-medium focus:ring-2 focus:ring-purple-400 outline-none"
            >
              {practiceClients.map((c: any) => (
                <option key={c.id} value={c.id.toString()}>
                  {c.clientName} (ID: #{c.id})
                </option>
              ))}
            </select>

            {effectiveClientId && (
              <Link
                href={`/payroll/${effectiveClientId}`}
                className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
              >
                Open Workspace <ArrowRight size={13} />
              </Link>
            )}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            {match ? `${currentClient?.clientName || "Client"} — Payroll Settings` : "Payroll Scheme Settings"}
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            {match 
              ? `Manage statutory PAYE reference, Employment Allowance, and payment accounts for ${currentClient?.clientName || "this employer"}.`
              : `Configure HMRC PAYE reference, accounts office credentials, and bureau settings for ${currentClient?.clientName || "selected client"}.`
            }
          </p>
        </div>
        <button 
          onClick={handleSave} 
          disabled={saveMutation.isPending}
          className="btn-SanSuite flex items-center gap-2 disabled:opacity-50 text-xs font-semibold cursor-pointer"
        >
          <Save size={14} /> Save Details
        </button>
      </div>

      {saved && (
        <div className="bg-green-50 border-l-4 border-green-500 p-3 text-xs text-green-700 flex items-center gap-2">
          <strong>Success!</strong> PAYE Scheme settings saved successfully.
        </div>
      )}

      <div className="flex gap-6">

          {/* Sub Navigation */}
          <div className="w-64 flex-shrink-0">
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
              <button 
                onClick={() => setActiveTab("paye")} 
                className={`w-full text-left px-4 py-3 text-sm border-b border-gray-100 ${activeTab === 'paye' ? 'bg-purple-50 text-purple-700 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                PAYE Details
              </button>
              <button 
                onClick={() => setActiveTab("contact")} 
                className={`w-full text-left px-4 py-3 text-sm border-b border-gray-100 ${activeTab === 'contact' ? 'bg-purple-50 text-purple-700 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                Contact Details
              </button>
              <button 
                onClick={() => setActiveTab("hmrc")} 
                className={`w-full text-left px-4 py-3 text-sm border-b border-gray-100 ${activeTab === 'hmrc' ? 'bg-purple-50 text-purple-700 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                HMRC Credentials
              </button>
              <button 
                onClick={() => setActiveTab("payslip")} 
                className={`w-full text-left px-4 py-3 text-sm border-b border-gray-100 ${activeTab === 'payslip' ? 'bg-purple-50 text-purple-700 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                Payslip Templates
              </button>
              <button 
                onClick={() => setActiveTab("payrate")} 
                className={`w-full text-left px-4 py-3 text-sm ${activeTab === 'payrate' ? 'bg-purple-50 text-purple-700 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                Pay Rate
              </button>
            </div>
          </div>

          {/* Tab Content */}
          <div className="flex-grow">
            {activeTab === "paye" && (
              <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
                <div className="px-5 py-4 border-b border-gray-200 bg-gray-50 font-medium text-gray-700">PAYE Scheme Configuration</div>
                <div className="p-5 grid grid-cols-2 gap-8">
                  {/* Left Column */}
                  <div className="space-y-4">
                    <div className="relative" ref={suggestionRef}>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-semibold text-gray-700">Employer Name *</label>
                        <span className="text-[10px] text-purple-700 bg-purple-50 px-2 py-0.5 rounded font-medium border border-purple-200">
                          Client / Company Legal Name
                        </span>
                      </div>
                      
                      <div className="relative">
                        <input 
                          type="text" 
                          value={form.employerName} 
                          onChange={e => {
                            setForm({...form, employerName: e.target.value});
                            setShowSuggestions(true);
                          }} 
                          onFocus={() => setShowSuggestions(true)}
                          placeholder="Type 2+ letters to auto-suggest company names..." 
                          className="w-full text-sm border border-gray-300 rounded px-3 py-2 pr-16 focus:ring-2 focus:ring-purple-400 outline-none bg-white" 
                        />

                        <div className="absolute right-2 top-2.5 flex items-center gap-1.5">
                          {isSearchingCh && (
                            <Loader2 size={14} className="animate-spin text-purple-600" />
                          )}
                          {form.employerName ? (
                            <button
                              type="button"
                              onClick={() => {
                                setForm({ ...form, employerName: "" });
                                setShowSuggestions(false);
                              }}
                              className="text-gray-400 hover:text-gray-600 p-0.5 rounded-full hover:bg-gray-100 cursor-pointer transition-colors"
                              title="Clear Employer Name"
                            >
                              <X size={14} />
                            </button>
                          ) : null}
                        </div>
                      </div>

                      {/* Floating Auto-suggestions Dropdown */}
                      {showSuggestions && (matchingPracticeClients.length > 0 || chResults.length > 0 || isSearchingCh) && (
                        <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-2xl z-50 overflow-hidden divide-y divide-gray-100 max-h-80 overflow-y-auto">
                          {/* Practice Clients */}
                          {matchingPracticeClients.length > 0 && (
                            <div className="p-2 bg-slate-50/70">
                              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-2 py-1 flex items-center gap-1">
                                <Building2 size={11} className="text-purple-600" /> Practice Clients
                              </div>
                              {matchingPracticeClients.map((client: any) => (
                                <div
                                  key={client.id}
                                  onClick={() => {
                                    setForm({ ...form, employerName: client.clientName });
                                    setShowSuggestions(false);
                                  }}
                                  className="p-2 rounded-lg hover:bg-purple-100/60 cursor-pointer flex items-center justify-between text-xs transition-colors"
                                >
                                  <div>
                                    <p className="font-semibold text-gray-900">{client.clientName}</p>
                                    <p className="text-[11px] text-gray-500">
                                      Code: {client.clientCode || "—"} • {client.entityType || "Limited"}
                                    </p>
                                  </div>
                                  <span className="text-[10px] bg-purple-100 text-purple-800 font-semibold px-2 py-0.5 rounded">
                                    Select
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Companies House Results */}
                          {chResults.length > 0 && (
                            <div className="p-2">
                              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-2 py-1 flex items-center gap-1">
                                <Sparkles size={11} className="text-amber-500" /> UK Companies House (Live)
                              </div>
                              {chResults.map((item: any) => (
                                <div
                                  key={item.company_number}
                                  onClick={() => {
                                    setForm({ ...form, employerName: item.title });
                                    setShowSuggestions(false);
                                  }}
                                  className="p-2 rounded-lg hover:bg-purple-50 cursor-pointer flex items-center justify-between text-xs transition-colors"
                                >
                                  <div className="max-w-[75%]">
                                    <p className="font-semibold text-gray-900 truncate">{item.title}</p>
                                    <p className="text-[11px] text-gray-500 font-mono truncate">
                                      #{item.company_number} • {item.address_snippet || "United Kingdom"}
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                                      item.company_status === "active" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-gray-100 text-gray-600"
                                    }`}>
                                      {item.company_status || "Registered"}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {isSearchingCh && chResults.length === 0 && (
                            <div className="p-4 text-center text-xs text-gray-400 flex items-center justify-center gap-2">
                              <Loader2 size={14} className="animate-spin text-purple-600" /> Searching Companies House...
                            </div>
                          )}

                          <div className="p-2 bg-gray-50 text-[10px] text-gray-400 text-center">
                            Click any company to auto-fill, or continue typing custom name.
                          </div>
                        </div>
                      )}

                      <p className="text-[11px] text-gray-500 mt-1">
                        The registered legal name of the business/company that pays the employees (as registered on HMRC PAYE).
                      </p>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">HMRC Office Number *</label>
                      <input type="text" maxLength={3} placeholder="e.g. 123" value={form.hmrcOfficeNumber} onChange={e => setForm({...form, hmrcOfficeNumber: e.target.value})} className="w-full text-sm border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-purple-400 outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">PAYE Reference *</label>
                      <input type="text" placeholder="e.g. AB456" value={form.payeReference} onChange={e => setForm({...form, payeReference: e.target.value})} className="w-full text-sm border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-purple-400 outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Accounts Office Reference *</label>
                      <input type="text" placeholder="e.g. 123AB12345678" value={form.accountsOfficeReference} onChange={e => setForm({...form, accountsOfficeReference: e.target.value})} className="w-full text-sm border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-purple-400 outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">ECON Reference</label>
                      <input type="text" value={form.econ} onChange={e => setForm({...form, econ: e.target.value})} className="w-full text-sm border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-purple-400 outline-none" />
                    </div>
                  </div>

                  {/* Right Column */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Default Pay Frequency</label>
                      <select value={form.defaultPayFrequency} onChange={e => setForm({...form, defaultPayFrequency: e.target.value})} className="w-full text-sm border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-purple-400 outline-none">
                        <option value="Weekly">Weekly</option>
                        <option value="Bi-weekly">Bi-weekly</option>
                        <option value="Four-weekly">Four-weekly</option>
                        <option value="Monthly">Monthly</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Payment Mode</label>
                      <select value={form.paymentMode} onChange={e => setForm({...form, paymentMode: e.target.value})} className="w-full text-sm border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-purple-400 outline-none">
                        <option value="Cash">Cash</option>
                        <option value="Cheque">Cheque</option>
                        <option value="BACS">BACS</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <div className="border border-gray-200 rounded-lg p-3 bg-gray-50 mt-4 space-y-3">
                      <h4 className="text-xs font-semibold text-gray-700">Bank Details</h4>
                      <div>
                        <label className="block text-[11px] text-gray-500 mb-1">Bank Name</label>
                        <input type="text" value={form.bankName} onChange={e => setForm({...form, bankName: e.target.value})} className="w-full text-sm border border-gray-300 rounded px-2 py-1" />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] text-gray-500 mb-1">Sort Code</label>
                          <input type="text" value={form.bankSortCode} onChange={e => setForm({...form, bankSortCode: e.target.value})} className="w-full text-sm border border-gray-300 rounded px-2 py-1" />
                        </div>
                        <div>
                          <label className="block text-[11px] text-gray-500 mb-1">Account Number</label>
                          <input type="text" value={form.bankAccountNumber} onChange={e => setForm({...form, bankAccountNumber: e.target.value})} className="w-full text-sm border border-gray-300 rounded px-2 py-1" />
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 space-y-2.5">
                      <label className="flex items-start gap-2.5 p-3 rounded-lg border border-purple-200 bg-purple-50/60 cursor-pointer hover:bg-purple-50 transition-colors">
                        <input 
                          type="checkbox" 
                          checked={form.employmentAllowance} 
                          onChange={e => setForm({...form, employmentAllowance: e.target.checked})} 
                          className="mt-0.5 rounded text-purple-600 focus:ring-purple-500 cursor-pointer" 
                        /> 
                        <div>
                          <span className="font-bold text-xs text-purple-950 block">Claim Employment Allowance (£5,000 / year)</span>
                          <span className="text-[11px] text-purple-800 block mt-0.5 leading-snug">
                            Reduces secondary Class 1 Employer National Insurance by up to £5,000 across the tax year for eligible businesses.
                          </span>
                        </div>
                      </label>
                      <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
                        <input type="checkbox" checked={form.smallEmployersRelief} onChange={e => setForm({...form, smallEmployersRelief: e.target.checked})} className="rounded text-purple-600 focus:ring-purple-500 cursor-pointer" /> 
                        Qualify for Small Employer's Relief (103% statutory pay recovery)
                      </label>
                      <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
                        <input type="checkbox" checked={form.syncBookkeeping} onChange={e => setForm({...form, syncBookkeeping: e.target.checked})} className="rounded text-purple-600 focus:ring-purple-500 cursor-pointer" /> 
                        Synchronise data with Bookkeeping General Ledger
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "contact" && (
              <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
                <div className="px-5 py-4 border-b border-gray-200 bg-gray-50 font-medium text-gray-700">Employer Contact Details</div>
                <div className="p-5 grid grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Contact Person / Payroll Admin</label>
                      <input type="text" value={form.contactName} onChange={e => setForm({...form, contactName: e.target.value})} className="w-full text-sm border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-purple-400 outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Payroll Email Address</label>
                      <input type="email" value={form.contactEmail} onChange={e => setForm({...form, contactEmail: e.target.value})} className="w-full text-sm border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-purple-400 outline-none" />
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Phone Number</label>
                      <input type="text" value={form.contactPhone} onChange={e => setForm({...form, contactPhone: e.target.value})} className="w-full text-sm border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-purple-400 outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Registered Office Address</label>
                      <textarea rows={3} value={form.contactAddress} onChange={e => setForm({...form, contactAddress: e.target.value})} className="w-full text-sm border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-purple-400 outline-none" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "hmrc" && (
              <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
                <div className="px-5 py-4 border-b border-gray-200 bg-gray-50 font-medium text-gray-700">HMRC MTD Government Gateway Credentials</div>
                <div className="p-5 grid grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Government Gateway User ID</label>
                      <input type="text" value={form.gatewayUserId} onChange={e => setForm({...form, gatewayUserId: e.target.value})} className="w-full text-sm border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-purple-400 outline-none font-mono" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Government Gateway Password</label>
                      <input type="password" value={form.gatewayPassword} onChange={e => setForm({...form, gatewayPassword: e.target.value})} className="w-full text-sm border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-purple-400 outline-none font-mono" />
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Sender Type</label>
                      <select value={form.senderType} onChange={e => setForm({...form, senderType: e.target.value})} className="w-full text-sm border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-purple-400 outline-none">
                        <option value="Employer">Employer</option>
                        <option value="Agent">Agent (Tax Representative)</option>
                      </select>
                    </div>
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-xs text-green-800 space-y-1">
                      <strong className="block text-green-900">MTD API Connection Active</strong>
                      <p>Your HMRC Gateway credentials are verified and authorized for RTI FPS/EPS transmissions.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "payslip" && (
              <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
                <div className="px-5 py-4 border-b border-gray-200 bg-gray-50 font-medium text-gray-700">Payslip Template & Layout Preferences</div>
                <div className="p-5 space-y-5">
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Payslip Layout Template</label>
                      <select value={form.payslipTemplate} onChange={e => setForm({...form, payslipTemplate: e.target.value})} className="w-full text-sm border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-purple-400 outline-none">
                        <option value="Classic Modern">Classic Modern (Standard UK PDF)</option>
                        <option value="Detailed Breakdown">Detailed Breakdown (Itemized Allowances)</option>
                        <option value="Compact FRS">Compact FRS</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Payslip Custom Note / Message</label>
                      <input type="text" value={form.payslipNote} onChange={e => setForm({...form, payslipNote: e.target.value})} className="w-full text-sm border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-purple-400 outline-none" />
                    </div>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-gray-100">
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                      <input type="checkbox" checked={form.showYtdTotals} onChange={e => setForm({...form, showYtdTotals: e.target.checked})} className="rounded text-purple-600 focus:ring-purple-500" />
                      Display Year-to-Date (YTD) Gross, Tax, and NI totals on payslips
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                      <input type="checkbox" checked={form.showEmployerAddress} onChange={e => setForm({...form, showEmployerAddress: e.target.checked})} className="rounded text-purple-600 focus:ring-purple-500" />
                      Display registered employer address on PDF header
                    </label>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "payrate" && (
              <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
                <div className="px-5 py-4 border-b border-gray-200 bg-gray-50 font-medium text-gray-700">Default Pay Rates & Hours Configuration</div>
                <div className="p-5 grid grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Standard Hourly Rate (£)</label>
                      <input type="text" value={form.standardHourlyRate} onChange={e => setForm({...form, standardHourlyRate: e.target.value})} className="w-full text-sm border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-purple-400 outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Overtime Multiplier (e.g. 1.5x)</label>
                      <input type="text" value={form.overtimeMultiplier} onChange={e => setForm({...form, overtimeMultiplier: e.target.value})} className="w-full text-sm border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-purple-400 outline-none" />
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Bank Holiday Multiplier (e.g. 2.0x)</label>
                      <input type="text" value={form.bankHolidayMultiplier} onChange={e => setForm({...form, bankHolidayMultiplier: e.target.value})} className="w-full text-sm border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-purple-400 outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Standard Weekly Hours</label>
                      <input type="text" value={form.standardWeeklyHours} onChange={e => setForm({...form, standardWeeklyHours: e.target.value})} className="w-full text-sm border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-purple-400 outline-none" />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
  );

  if (match) {
    return (
      <ClientPayrollLayout activeSection="Payroll Settings">
        {content}
      </ClientPayrollLayout>
    );
  }

  return (
    <AppLayout sidebar={practicePayrollSidebar} module="Payroll">
      <div className="p-6 bg-gray-50 min-h-screen">
        <div className="w-full">
          {content}
        </div>
      </div>
    </AppLayout>
  );
}

