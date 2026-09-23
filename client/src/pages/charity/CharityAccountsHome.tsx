import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AppLayout from "../../components/layout/AppLayout";
import {
  HeartHandshake, Settings, ExternalLink, Search, Download,
  Eye, Plus, Maximize2, Minus, FileText, Building2,
  CheckCircle2, Shield, AlertCircle, X, Key, Coins,
  Calendar, Layers, Save, HelpCircle
} from "lucide-react";
import { apiRequest } from "../../lib/queryClient";
import { Link, useSearch, useLocation } from "wouter";
import { useToast } from "../../hooks/useToast";

const sidebar = [
  { label: "Dashboard", icon: <HeartHandshake size={15} />, route: "/charity-accounts" },
  { label: "SORP Mapping", icon: <FileText size={15} />, route: "/charity-accounts?tab=sorp" },
  { label: "Charity Authorisation", icon: <Key size={15} />, route: "/charity-accounts?tab=auth" },
  { label: "General Settings", icon: <Settings size={15} />, route: "/charity-accounts?tab=settings" },
];

export default function CharityAccountsHome() {
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const searchParams = new URLSearchParams(searchString);
  const currentTab = searchParams.get("tab") || "dashboard";
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [charityTypeFilter, setCharityTypeFilter] = useState("All");
  const [methodFilter, setMethodFilter] = useState("All");
  const [panels, setPanels] = useState({ summary: true, clients: true });
  const [showOnboardModal, setShowOnboardModal] = useState(false);

  // New Charity Form State
  const [newCharity, setNewCharity] = useState({
    name: "",
    regulator: "Charity Commission for England and Wales",
    charityRegNumber: "",
    companyRegNumber: "",
    charityType: "Charitable Incorporated Organisation (CIO)",
    reportingType: "Independent Examination",
    accountingMethod: "Accrual",
    contactPerson: "",
    contactEmail: "",
    contactPhone: "",
    addressLine1: "",
    townCity: "",
    postcode: "",
    periodStartDate: `${new Date().getFullYear()}-04-01`,
    periodEndDate: `${new Date().getFullYear() + 1}-03-31`,
  });

  // Fetch Charities from Database
  const { data: charityData, isLoading } = useQuery({
    queryKey: ["/api/charity/list"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/charity/list");
      if (!res.ok) throw new Error("Failed to load charities");
      return res.json();
    },
  });

  const charities = charityData?.charities || [];
  const stats = charityData?.stats || {
    totalCharities: 0,
    accrualsCount: 0,
    cashBasisCount: 0,
    auditedCount: 0,
  };

  // Fetch SORP Mappings
  const { data: sorpMappings = [], isLoading: isLoadingMappings } = useQuery({
    queryKey: ["/api/charity/sorp-mappings"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/charity/sorp-mappings");
      if (!res.ok) return [];
      return res.json();
    },
    enabled: currentTab === "sorp",
  });

  // Filter charities
  const filteredCharities = charities.filter((c: any) => {
    const matchesSearch =
      c.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.charityRegNumber?.toLowerCase().includes(search.toLowerCase()) ||
      c.companyRegNumber?.toLowerCase().includes(search.toLowerCase());

    const matchesType = charityTypeFilter === "All" || c.charityType === charityTypeFilter;
    const matchesMethod = methodFilter === "All" || c.accountingMethod === methodFilter;

    return matchesSearch && matchesType && matchesMethod;
  });

  // Onboard Mutation
  const createCharityMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/charity/create", newCharity);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to create charity");
      }
      return res.json();
    },
    onSuccess: (data: any) => {
      toast({ title: "Charity Registered", description: `${newCharity.name} onboarded successfully.` });
      queryClient.invalidateQueries({ queryKey: ["/api/charity/list"] });
      setShowOnboardModal(false);
      // Reset form
      setNewCharity({
        name: "",
        regulator: "Charity Commission for England and Wales",
        charityRegNumber: "",
        companyRegNumber: "",
        charityType: "Charitable Incorporated Organisation (CIO)",
        reportingType: "Independent Examination",
        accountingMethod: "Accrual",
        contactPerson: "",
        contactEmail: "",
        contactPhone: "",
        addressLine1: "",
        townCity: "",
        postcode: "",
        periodStartDate: `${new Date().getFullYear()}-04-01`,
        periodEndDate: `${new Date().getFullYear() + 1}-03-31`,
      });
      // Navigate directly into the newly created charity's workspace
      if (data?.id) {
        setLocation(`/charity-accounts/${data.id}/dashboard`);
      }
    },
    onError: (err: any) => {
      toast({ title: "Onboarding Error", description: err.message, variant: "destructive" });
    },
  });

  return (
    <AppLayout sidebar={sidebar} module="Charity Accounts">
      <div className="bg-slate-50 min-h-screen pb-16">
        {/* Top Breadcrumb Header */}
        <div className="bg-white px-6 py-2.5 flex items-center justify-between border-b border-slate-200">
          <div className="flex items-center text-xs text-slate-500 gap-1.5">
            <span className="flex items-center gap-1 hover:text-orange-600 cursor-pointer font-medium">
              <HeartHandshake size={14} /> Home
            </span>
            <span>/</span>
            <span className="text-slate-700 font-semibold">Charity Accounts</span>
          </div>
          <div className="flex items-center gap-3 text-slate-400">
            <Link href="/charity-accounts?tab=settings">
              <Settings size={15} className="cursor-pointer hover:text-orange-600 transition-colors" />
            </Link>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
          {/* Main Title Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                {currentTab === "dashboard" && "Charity Accounts Practice Hub"}
                {currentTab === "sorp" && "Chart of Accounts to SORP Mapping"}
                {currentTab === "auth" && "Charity Commission Authorisation"}
                {currentTab === "settings" && "General Settings & Filing Defaults"}
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                UK Charities SORP (FRS 102) & Cash Basis reporting suite for England & Wales, Scotland (OSCR) and Northern Ireland (CCNI).
              </p>
            </div>
            {currentTab === "dashboard" && (
              <button
                onClick={() => setShowOnboardModal(true)}
                className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg text-xs font-semibold transition-colors shadow-sm cursor-pointer"
              >
                <Plus size={15} />
                <span>New Charity Client</span>
              </button>
            )}
          </div>

          {/* DASHBOARD TAB */}
          {currentTab === "dashboard" && (
            <div className="space-y-6">
              {/* Summary Metrics Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Total Charities</span>
                  <div className="text-2xl font-bold text-slate-900 mt-1">{stats.totalCharities}</div>
                  <p className="text-[11px] text-slate-500 mt-0.5">Active under practice management</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Accruals Basis (SORP)</span>
                  <div className="text-2xl font-bold text-orange-600 mt-1">{stats.accrualsCount}</div>
                  <p className="text-[11px] text-slate-500 mt-0.5">FRS 102 SoFA & Balance Sheet</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Cash Basis (R&P)</span>
                  <div className="text-2xl font-bold text-emerald-600 mt-1">{stats.cashBasisCount}</div>
                  <p className="text-[11px] text-slate-500 mt-0.5">Receipts and Payments regime</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Independent Scrutiny</span>
                  <div className="text-2xl font-bold text-purple-600 mt-1">{stats.auditedCount}</div>
                  <p className="text-[11px] text-slate-500 mt-0.5">Audited or independent examined</p>
                </div>
              </div>

              {/* Charities Table Card */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                {/* Search & Filter Bar */}
                <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/50">
                  <div className="relative flex-1 max-w-md">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search charities by name, commission reg or company number..."
                      className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500 bg-white"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:border-orange-500"
                      value={charityTypeFilter}
                      onChange={(e) => setCharityTypeFilter(e.target.value)}
                    >
                      <option value="All">All Entity Types</option>
                      <option value="Charitable Incorporated Organisation (CIO)">CIO</option>
                      <option value="Charitable Company (Limited by Guarantee)">Charitable Company</option>
                      <option value="Charitable Un-incorporated Association">Un-incorporated</option>
                    </select>

                    <select
                      className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:border-orange-500"
                      value={methodFilter}
                      onChange={(e) => setMethodFilter(e.target.value)}
                    >
                      <option value="All">All Accounting Frameworks</option>
                      <option value="Accrual">Accruals (SORP FRS 102)</option>
                      <option value="Cash">Cash Basis (R&P)</option>
                    </select>
                  </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                        <th className="px-5 py-3.5">Charity Name</th>
                        <th className="px-5 py-3.5">Legal Structure</th>
                        <th className="px-5 py-3.5">Registration Numbers</th>
                        <th className="px-5 py-3.5">Accounting Regime</th>
                        <th className="px-5 py-3.5">Active Period</th>
                        <th className="px-5 py-3.5">Funds</th>
                        <th className="px-5 py-3.5 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {isLoading ? (
                        <tr><td colSpan={7} className="py-12 text-center text-slate-400">Loading charities...</td></tr>
                      ) : filteredCharities.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-16 text-center text-slate-400">
                            <HeartHandshake size={36} className="mx-auto text-slate-300 mb-2" />
                            <p className="text-sm font-semibold text-slate-700">No Charity Clients Found</p>
                            <p className="text-xs text-slate-500 mt-1 mb-4">
                              {search || charityTypeFilter !== "All" || methodFilter !== "All"
                                ? "No charities match the current filter criteria."
                                : "No charities registered in the system yet. Onboard your first charity to begin."}
                            </p>
                            <button
                              onClick={() => setShowOnboardModal(true)}
                              className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
                            >
                              + Onboard New Charity Client
                            </button>
                          </td>
                        </tr>
                      ) : (
                        filteredCharities.map((c: any) => (
                          <tr
                            key={c.id}
                            className="hover:bg-orange-50/20 transition-colors group cursor-pointer"
                            onClick={() => setLocation(`/charity-accounts/${c.id}/dashboard`)}
                          >
                            <td className="px-5 py-3.5">
                              <div className="font-bold text-slate-900 text-sm group-hover:text-orange-600 transition-colors">
                                {c.name}
                              </div>
                              <div className="text-[11px] text-slate-500 truncate max-w-xs">
                                {c.regulator}
                              </div>
                            </td>
                            <td className="px-5 py-3.5">
                              <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-slate-100 text-slate-700">
                                {c.charityType?.includes("CIO")
                                  ? "CIO"
                                  : c.charityType?.includes("Company")
                                  ? "Charitable Co"
                                  : "Unincorporated"}
                              </span>
                            </td>
                            <td className="px-5 py-3.5 font-mono text-slate-600">
                              {c.charityRegNumber && (
                                <div className="text-xs">
                                  Reg: <strong className="text-slate-800">{c.charityRegNumber}</strong>
                                </div>
                              )}
                              {c.companyRegNumber && (
                                <div className="text-[11px] text-slate-500">
                                  Co: {c.companyRegNumber}
                                </div>
                              )}
                            </td>
                            <td className="px-5 py-3.5">
                              <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded ${
                                c.accountingMethod === 'Cash'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-orange-50 text-orange-700 border border-orange-200'
                              }`}>
                                {c.accountingMethod === 'Cash' ? "Cash Basis" : "Accruals (SORP)"}
                              </span>
                            </td>
                            <td className="px-5 py-3.5 font-mono text-slate-600 text-xs">
                              {c.activePeriod ? `${c.activePeriod.startDate} to ${c.activePeriod.endDate}` : "31/03"}
                            </td>
                            <td className="px-5 py-3.5">
                              <span className="inline-flex items-center gap-1 font-mono text-slate-700 font-medium">
                                <Coins size={12} className="text-orange-500" />
                                <span>{c.fundCount || 3}</span>
                              </span>
                            </td>
                            <td className="px-5 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                              <Link href={`/charity-accounts/${c.id}/dashboard`}>
                                <button className="px-3 py-1 text-xs font-semibold text-orange-600 bg-orange-50 hover:bg-orange-100 rounded-md transition-colors">
                                  Open Workspace
                                </button>
                              </Link>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* SORP MAPPING TAB */}
          {currentTab === "sorp" && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
                <div>
                  <h2 className="font-bold text-slate-800 text-sm">Standard Nominal Code to Charities SORP Mapping</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Maps general ledger accounts to standard Statement of Financial Activities (SoFA) lines.
                  </p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                      <th className="px-5 py-3 w-28">Nominal Code</th>
                      <th className="px-5 py-3">Account Title</th>
                      <th className="px-5 py-3">Charity Commission SORP Category</th>
                      <th className="px-5 py-3">Default Fund Classification</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {isLoadingMappings ? (
                      <tr><td colSpan={4} className="py-8 text-center text-slate-400">Loading mappings...</td></tr>
                    ) : (
                      sorpMappings.map((m: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-50/60">
                          <td className="px-5 py-3 font-mono font-bold text-slate-700">{m.nominalCode}</td>
                          <td className="px-5 py-3 font-medium text-slate-900">{m.accountName}</td>
                          <td className="px-5 py-3">
                            <span className="px-2.5 py-1 text-xs font-medium bg-orange-50 text-orange-700 rounded-md border border-orange-200">
                              {m.sorpCategory}
                            </span>
                          </td>
                          <td className="px-5 py-3 font-medium text-slate-600">
                            {m.fundType === "Restricted" ? (
                              <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-purple-100 text-purple-700">
                                Restricted
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-blue-100 text-blue-700">
                                Unrestricted
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* AUTH TAB */}
          {currentTab === "auth" && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 max-w-2xl mx-auto space-y-6">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center font-bold">
                  <Key size={20} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Charity Commission Presenter Credentials</h2>
                  <p className="text-xs text-slate-500">Configure practice authentication for electronic Charity Commission filings.</p>
                </div>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Presenter Account ID / User ID</label>
                  <input
                    type="text"
                    placeholder="Enter practice presenter ID"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Authorisation Password / Key</label>
                  <input
                    type="password"
                    placeholder="••••••••••••"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Default Regulator</label>
                  <select className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500 bg-white">
                    <option>Charity Commission for England and Wales</option>
                    <option>OSCR (Office of the Scottish Charity Regulator)</option>
                    <option>Charity Commission for Northern Ireland</option>
                  </select>
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => toast({ title: "Authorisation Saved", description: "Regulator credentials saved securely." })}
                    className="px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-semibold shadow-sm transition-colors"
                  >
                    Save Authorisation Credentials
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* SETTINGS TAB */}
          {currentTab === "settings" && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 max-w-2xl mx-auto space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <h2 className="text-base font-bold text-slate-900">Charity Module General Settings</h2>
                <p className="text-xs text-slate-500 mt-0.5">Firm-wide defaults for charity accounts and donation reports.</p>
              </div>

              <div className="space-y-4 text-xs">
                <label className="flex items-center gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer">
                  <input type="checkbox" defaultChecked className="rounded text-orange-600 focus:ring-orange-500" />
                  <div>
                    <div className="font-semibold text-slate-800">Auto-Calculate Gift Aid Repayments (25%)</div>
                    <div className="text-slate-500 text-[11px]">Automatically compute 25% tax repayment on donations with Gift Aid declarations.</div>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer">
                  <input type="checkbox" defaultChecked className="rounded text-orange-600 focus:ring-orange-500" />
                  <div>
                    <div className="font-semibold text-slate-800">Enable Rounding to Nearest £</div>
                    <div className="text-slate-500 text-[11px]">Automatically round SoFA and Balance Sheet amounts to the nearest whole pound in reports.</div>
                  </div>
                </label>

                <div className="pt-2">
                  <button
                    onClick={() => toast({ title: "Settings Updated", description: "Default settings saved." })}
                    className="px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-semibold shadow-sm transition-colors"
                  >
                    Save Preferences
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MODAL: Onboard New Charity Client */}
      {showOnboardModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg my-8 overflow-hidden animate-in fade-in duration-200">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center font-bold">
                  <HeartHandshake size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Onboard New Charity Client</h3>
                  <p className="text-[11px] text-slate-500">Add charity details, legal form and default accounting setup.</p>
                </div>
              </div>
              <button onClick={() => setShowOnboardModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={16} />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Charity Legal Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Hope Wildlife & Conservation Trust"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500"
                  value={newCharity.name}
                  onChange={(e) => setNewCharity({ ...newCharity, name: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Regulator *</label>
                  <select
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500 bg-white"
                    value={newCharity.regulator}
                    onChange={(e) => setNewCharity({ ...newCharity, regulator: e.target.value })}
                  >
                    <option value="Charity Commission for England and Wales">England & Wales (CC)</option>
                    <option value="OSCR (Scottish Charity Regulator)">Scotland (OSCR)</option>
                    <option value="Charity Commission for Northern Ireland">Northern Ireland (CCNI)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Charity Reg Number</label>
                  <input
                    type="text"
                    placeholder="e.g. 1122334"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500 font-mono"
                    value={newCharity.charityRegNumber}
                    onChange={(e) => setNewCharity({ ...newCharity, charityRegNumber: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Charity Legal Form</label>
                  <select
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500 bg-white"
                    value={newCharity.charityType}
                    onChange={(e) => setNewCharity({ ...newCharity, charityType: e.target.value })}
                  >
                    <option value="Charitable Incorporated Organisation (CIO)">CIO</option>
                    <option value="Charitable Company (Limited by Guarantee)">Charitable Company</option>
                    <option value="Charitable Un-incorporated Association">Un-incorporated</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Company Reg Number</label>
                  <input
                    type="text"
                    placeholder="e.g. 04321876 (if company)"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500 font-mono"
                    value={newCharity.companyRegNumber}
                    onChange={(e) => setNewCharity({ ...newCharity, companyRegNumber: e.target.value })}
                  />
                </div>
              </div>

              <div className="p-3.5 bg-orange-50/50 rounded-xl border border-orange-200 space-y-2">
                <label className="block text-xs font-bold text-orange-950 uppercase tracking-wider">
                  Accounting Framework & Periods
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Accounting Basis</label>
                    <select
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500 bg-white"
                      value={newCharity.accountingMethod}
                      onChange={(e) => setNewCharity({ ...newCharity, accountingMethod: e.target.value })}
                    >
                      <option value="Accrual">Accruals (SORP FRS 102)</option>
                      <option value="Cash">Cash Basis (Receipts & Payments)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Scrutiny</label>
                    <select
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500 bg-white"
                      value={newCharity.reportingType}
                      onChange={(e) => setNewCharity({ ...newCharity, reportingType: e.target.value })}
                    >
                      <option value="Independent Examination">Independent Examination</option>
                      <option value="Audited">Statutory Audit</option>
                      <option value="Exempt">Exempt</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Period Start Date</label>
                    <input
                      type="date"
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                      value={newCharity.periodStartDate}
                      onChange={(e) => setNewCharity({ ...newCharity, periodStartDate: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Period End Date</label>
                    <input
                      type="date"
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                      value={newCharity.periodEndDate}
                      onChange={(e) => setNewCharity({ ...newCharity, periodEndDate: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Lead Trustee / Contact Person</label>
                <input
                  type="text"
                  placeholder="e.g. Reverend David Miller"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500"
                  value={newCharity.contactPerson}
                  onChange={(e) => setNewCharity({ ...newCharity, contactPerson: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Contact Email</label>
                  <input
                    type="email"
                    placeholder="trustees@charity.org.uk"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500"
                    value={newCharity.contactEmail}
                    onChange={(e) => setNewCharity({ ...newCharity, contactEmail: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    placeholder="020 7946 0123"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500"
                    value={newCharity.contactPhone}
                    onChange={(e) => setNewCharity({ ...newCharity, contactPhone: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowOnboardModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={createCharityMutation.isPending}
                  onClick={() => createCharityMutation.mutate()}
                  className="px-5 py-2 text-xs font-semibold text-white bg-orange-600 hover:bg-orange-700 rounded-lg shadow-sm disabled:opacity-50"
                >
                  {createCharityMutation.isPending ? "Onboarding..." : "Confirm & Onboard Charity"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
