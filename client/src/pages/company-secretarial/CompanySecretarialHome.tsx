import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useSearch } from "wouter";
import AppLayout from "../../components/layout/AppLayout";
import {
  Shield, Building2, FilePlus, Search, Download, ExternalLink,
  Plus, Calendar, AlertTriangle, CheckCircle2, MoreVertical,
  Users, FileText, Trash2, RefreshCw, Clock, Settings,
  Send, Check, X, ChevronDown, Filter, UserCheck, Landmark,
  AlertCircle
} from "lucide-react";
import { apiRequest, queryClient } from "../../lib/queryClient";
import { useToast } from "../../hooks/useToast";
import { useConfirm } from "../../hooks/useConfirm";

const sidebar = [
  { label: "Action Station", icon: <Shield size={15} />, route: "/company-secretarial" },
  { label: "Companies", icon: <Building2 size={15} />, route: "/company-secretarial?tab=companies" },
  { label: "People", icon: <Users size={15} />, route: "/company-secretarial?tab=people" },
  { label: "Formations", icon: <FilePlus size={15} />, route: "/company-secretarial?tab=formations" },
  { label: "Submissions", icon: <Send size={15} />, route: "/company-secretarial?tab=submissions" },
];

export default function CompanySecretarialHome() {
  const [, navigate] = useLocation();
  const searchString = useSearch();
  const searchParams = new URLSearchParams(searchString);
  const currentTab = searchParams.get("tab") || "dashboard";
  const { toast } = useToast();
  const confirm = useConfirm();

  const [search, setSearch] = useState("");
  const [activeDropdown, setActiveDropdown] = useState<number | null>(null);

  // Modals state
  const [showAddCompanyModal, setShowAddCompanyModal] = useState(false);
  const [addMode, setAddMode] = useState<"ch_download" | "type_own">("ch_download");
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showSubmissionsModal, setShowSubmissionsModal] = useState(false);

  // CH Download state
  const [chCompanyNumber, setChCompanyNumber] = useState("");
  const [chFilingCode, setChFilingCode] = useState("");
  const [overwritePeople, setOverwritePeople] = useState(false);
  const [chPreviewData, setChPreviewData] = useState<any>(null);
  const [isSearchingCh, setIsSearchingCh] = useState(false);

  // Type Own Data state
  const [manualForm, setManualForm] = useState({
    companyName: "",
    companyType: "Limited",
    companyRegNo: "",
    registeredAddress: "",
    country: "United Kingdom",
    sicCode: "62020",
    registeredEmail: "",
  });

  // Queries
  const { data: clients = [], isLoading: isLoadingClients } = useQuery({
    queryKey: ["/api/practice/clients"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/practice/clients");
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: deadlinesData, isLoading: isLoadingDeadlines } = useQuery({
    queryKey: ["/api/company-secretarial/deadlines"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/company-secretarial/deadlines");
      if (!res.ok) return { deadlines: [], counts: { totalCompanies: 0, csDueSoon: 0, accountsDueSoon: 0, overdueTotal: 0 } };
      return res.json();
    },
  });

  const { data: filings = [], isLoading: isLoadingFilings } = useQuery({
    queryKey: ["/api/company-secretarial/filings"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/company-secretarial/filings");
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: settingsData } = useQuery({
    queryKey: ["/api/company-secretarial/settings"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/company-secretarial/settings");
      if (!res.ok) return { settings: null };
      return res.json();
    },
  });

  const { data: people = [], isLoading: isLoadingPeople } = useQuery<any[]>({
    queryKey: ["/api/company-secretarial/people"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/company-secretarial/people");
      if (!res.ok) return [];
      return res.json();
    },
  });

  // Mutations
  const rollDeadline = useMutation({
    mutationFn: async ({ clientId, taskType }: { clientId: number, taskType: string }) => {
      const res = await apiRequest("POST", "/api/company-secretarial/deadlines/roll", { clientId, taskType });
      if (!res.ok) throw new Error("Failed to roll deadline");
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "Deadline Rolled Forward", description: data.message, type: "success" });
      queryClient.invalidateQueries({ queryKey: ["/api/company-secretarial/deadlines"] });
      queryClient.invalidateQueries({ queryKey: ["/api/practice/clients"] });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, type: "error" })
  });

  const deleteClient = useMutation({
    mutationFn: async (id: number) => {
      const isConfirmed = await confirm({
        title: "Remove Company",
        description: "Are you sure you want to remove this company? This action cannot be undone.",
        confirmText: "Remove",
        variant: "danger"
      });
      if (!isConfirmed) throw new Error("Cancelled");

      const res = await apiRequest("DELETE", `/api/practice/clients/${id}`);
      if (!res.ok) throw new Error("Failed to delete company");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/practice/clients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/company-secretarial/deadlines"] });
      toast({ title: "Company Removed", description: "The company has been removed from your list." });
    },
    onError: (e: any) => {
      if (e.message !== "Cancelled") {
        toast({ title: "Error", description: e.message, type: "error" });
      }
    },
  });

  const syncCompanyData = useMutation({
    mutationFn: async (clientId: number) => {
      const res = await apiRequest("POST", `/api/company-secretarial/sync-ch/${clientId}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to sync from Companies House");
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "Sync Successful", description: data.message, type: "success" });
      queryClient.invalidateQueries({ queryKey: ["/api/company-secretarial/deadlines"] });
      queryClient.invalidateQueries({ queryKey: ["/api/practice/clients"] });
    },
    onError: (e: any) => toast({ title: "Sync Failed", description: e.message, type: "error" })
  });

  // Handle Companies House Lookup for Download Modal
  const handleLookupCh = async () => {
    if (!chCompanyNumber.trim()) {
      toast({ title: "Company Number Required", description: "Please enter an 8-digit UK company number.", type: "error" });
      return;
    }
    setIsSearchingCh(true);
    setChPreviewData(null);
    try {
      const res = await apiRequest("GET", `/api/companies-house/company/${encodeURIComponent(chCompanyNumber.trim())}/all`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Company not found on Companies House.");
      }
      const data = await res.json();
      setChPreviewData(data);
    } catch (e: any) {
      toast({ title: "Lookup Failed", description: e.message, type: "error" });
    } finally {
      setIsSearchingCh(false);
    }
  };

  // Import from Companies House into DB
  const importFromCh = useMutation({
    mutationFn: async () => {
      if (!chPreviewData?.profile) throw new Error("No company data previewed.");
      const profile = chPreviewData.profile;
      const roa = profile.registered_office_address || {};
      const regAddress = [roa.address_line_1, roa.address_line_2, roa.locality, roa.postal_code, roa.country].filter(Boolean).join(", ");

      // 1. Create client
      const clientRes = await apiRequest("POST", "/api/myadmin/clients", {
        clientName: profile.company_name,
        clientType: profile.type || "Limited",
        registrationNumber: profile.company_number,
        address: regAddress,
        tradingStatus: profile.company_status === "active" ? "Trading" : "Dormant",
        isActive: true,
      });
      if (!clientRes.ok) throw new Error("Failed to create client in practice database");
      const clientData = await clientRes.json();
      const newClientId = clientData.id || clientData.clientId;

      // 2. Sync full bundle (csRecords, officers, pscs)
      await apiRequest("POST", `/api/company-secretarial/sync-ch/${newClientId}`);

      // 3. If auth code provided, save to csRecords
      if (chFilingCode) {
        await apiRequest("POST", "/api/company-secretarial/record", {
          clientId: newClientId,
          authCode: chFilingCode
        });
      }

      return newClientId;
    },
    onSuccess: (newClientId) => {
      toast({ title: "Company Downloaded", description: "Company imported from Companies House with all officers and dates.", type: "success" });
      queryClient.invalidateQueries({ queryKey: ["/api/practice/clients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/company-secretarial/deadlines"] });
      setShowAddCompanyModal(false);
      setChCompanyNumber("");
      setChFilingCode("");
      setChPreviewData(null);
      navigate(`/company-secretarial/${newClientId}`);
    },
    onError: (e: any) => toast({ title: "Download Failed", description: e.message, type: "error" })
  });

  // Save manual company
  const saveManualCompany = useMutation({
    mutationFn: async () => {
      if (!manualForm.companyName.trim()) throw new Error("Company Name is required");
      if (!manualForm.registeredAddress.trim()) throw new Error("Registered Office Address is required");
      if (!manualForm.sicCode.trim()) throw new Error("SIC Code is required");

      const clientRes = await apiRequest("POST", "/api/myadmin/clients", {
        clientName: manualForm.companyName,
        clientType: manualForm.companyType,
        registrationNumber: manualForm.companyRegNo || undefined,
        address: manualForm.registeredAddress,
        email: manualForm.registeredEmail || undefined,
        tradingStatus: "Trading",
        isActive: true
      });
      if (!clientRes.ok) throw new Error("Failed to create client in database");
      const clientData = await clientRes.json();
      const newClientId = clientData.id || clientData.clientId;

      // Create CS record
      const nextYear = new Date();
      nextYear.setFullYear(nextYear.getFullYear() + 1);

      await apiRequest("POST", "/api/company-secretarial/record", {
        clientId: newClientId,
        companyRegNo: manualForm.companyRegNo,
        companyType: manualForm.companyType,
        registeredAddress: manualForm.registeredAddress,
        registeredEmail: manualForm.registeredEmail,
        sicCode: manualForm.sicCode,
        nextConfirmationDue: nextYear,
        nextAccountsDue: nextYear,
      });

      return newClientId;
    },
    onSuccess: (newClientId) => {
      toast({ title: "Company Created", description: "New corporate client added successfully.", type: "success" });
      queryClient.invalidateQueries({ queryKey: ["/api/practice/clients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/company-secretarial/deadlines"] });
      setShowAddCompanyModal(false);
      setManualForm({
        companyName: "",
        companyType: "Limited",
        companyRegNo: "",
        registeredAddress: "",
        country: "United Kingdom",
        sicCode: "62020",
        registeredEmail: ""
      });
      navigate(`/company-secretarial/${newClientId}`);
    },
    onError: (e: any) => toast({ title: "Creation Failed", description: e.message, type: "error" })
  });

  // Filtered clients
  const limitedClients = clients.filter((c: any) => c.clientType === "Limited" || c.clientType === "Ltd" || c.clientType === "LLP" || !c.clientType);
  const filteredClients = limitedClients.filter((c: any) =>
    c.clientName?.toLowerCase().includes(search.toLowerCase()) ||
    c.registrationNumber?.toLowerCase().includes(search.toLowerCase())
  );

  const deadlines = deadlinesData?.deadlines || [];
  const counts = deadlinesData?.counts || {
    totalCompanies: limitedClients.length,
    csDueSoon: 0,
    accountsDueSoon: 0,
    overdueTotal: 0
  };

  const handleExport = () => {
    if (filteredClients.length === 0) {
      toast({ title: "Export Failed", description: "No data available to export.", type: "error" });
      return;
    }
    const headers = ["Company Name", "Registration No", "Company Type", "Trading Status", "Address"];
    const csvContent = [
      headers.join(","),
      ...filteredClients.map((c: any) =>
        `"${c.clientName || ''}","${c.registrationNumber || ''}","${c.clientType || 'Limited'}","${c.tradingStatus || 'Trading'}","${(c.address || '').replace(/"/g, '""')}"`
      )
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "sansuite_companies_export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <AppLayout sidebar={sidebar} module="Company Secretarial">
      <div className="bg-slate-50 min-h-screen pb-16">
        {/* Capium-Aligned Top Navigation Sub-bar */}
        <div className="bg-slate-900 text-slate-200 px-6 py-2.5 flex flex-wrap items-center justify-between border-b border-slate-800 shadow-sm">
          <div className="flex items-center gap-6 text-sm font-medium">
            <button
              onClick={() => navigate("/company-secretarial")}
              className={`hover:text-white transition-colors cursor-pointer flex items-center gap-1.5 ${currentTab === "dashboard" ? "text-white font-semibold" : "text-slate-400"}`}
            >
              <Shield size={15} /> Home
            </button>
            <button
              onClick={() => setShowSettingsModal(true)}
              className="text-slate-400 hover:text-white transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Settings size={15} /> My Office
            </button>
            <button
              onClick={() => navigate("/company-secretarial?tab=companies")}
              className={`hover:text-white transition-colors cursor-pointer flex items-center gap-1.5 ${currentTab === "companies" ? "text-white font-semibold" : "text-slate-400"}`}
            >
              <Building2 size={15} /> Company
            </button>
            <button
              onClick={() => navigate("/company-secretarial?tab=people")}
              className={`hover:text-white transition-colors cursor-pointer flex items-center gap-1.5 ${currentTab === "people" ? "text-white font-semibold" : "text-slate-400"}`}
            >
              <Users size={15} /> Person ({people.length})
            </button>
            <button
              onClick={() => navigate("/company-secretarial?tab=formations")}
              className={`hover:text-white transition-colors cursor-pointer flex items-center gap-1.5 ${currentTab === "formations" ? "text-white font-semibold" : "text-slate-400"}`}
            >
              <FilePlus size={15} /> Formations
            </button>
            <button
              onClick={() => navigate("/company-secretarial?tab=submissions")}
              className={`hover:text-white transition-colors cursor-pointer flex items-center gap-1.5 ${currentTab === "submissions" ? "text-white font-semibold" : "text-slate-400"}`}
            >
              <Send size={15} /> E-Filing ({filings.length})
            </button>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <button
              onClick={() => {
                setAddMode("ch_download");
                setShowAddCompanyModal(true);
              }}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
            >
              <Download size={14} /> Download from CH
            </button>
            <button
              onClick={() => navigate("/practice/clients")}
              className="text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              Return to client list &rarr;
            </button>
          </div>
        </div>

        <div className="p-6 w-full mx-auto space-y-6">
          {/* Header Action Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <div>
              <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2.5">
                <Building2 className="text-slate-700" size={26} />
                {currentTab === "dashboard" && "Action Station & Compliance"}
                {currentTab === "companies" && "Managed Corporate Clients"}
                {currentTab === "people" && "People & Officers Directory"}
                {currentTab === "formations" && "Company Formations (IN01)"}
                {currentTab === "submissions" && "E-Filing Submissions Log"}
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                UK Companies House Secretarial Suite with live CS01 filings, statutory registers, and formations.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                onClick={() => {
                  setAddMode("ch_download");
                  setShowAddCompanyModal(true);
                }}
                className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl border border-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Download size={14} /> Download from CH
              </button>
              <button
                onClick={() => {
                  setAddMode("type_own");
                  setShowAddCompanyModal(true);
                }}
                className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl border border-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Plus size={14} /> Add Company
              </button>
              <button
                onClick={() => navigate("/company-secretarial/formations/new")}
                className="px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <FilePlus size={14} /> Start New Formation
              </button>
            </div>
          </div>

          {/* TAB 1: ACTION STATION (HOME / DEADLINES) */}
          {currentTab === "dashboard" && (
            <div className="space-y-6">
              {/* Metric Cards - 100% Authentic DB */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
                  <div className="flex justify-between items-center text-slate-500 text-xs font-medium mb-2">
                    <span>Managed Companies</span>
                    <span className="p-2 bg-blue-50 text-blue-600 rounded-xl"><Building2 size={16} /></span>
                  </div>
                  <div className="text-3xl font-extrabold text-slate-800">{counts.totalCompanies}</div>
                  <div className="text-[11px] text-emerald-600 font-medium mt-1 flex items-center gap-1">
                    <CheckCircle2 size={12} /> Active Corporate Entities
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
                  <div className="flex justify-between items-center text-slate-500 text-xs font-medium mb-2">
                    <span>CS01 Due (30 Days)</span>
                    <span className="p-2 bg-amber-50 text-amber-600 rounded-xl"><AlertTriangle size={16} /></span>
                  </div>
                  <div className="text-3xl font-extrabold text-slate-800">{counts.csDueSoon}</div>
                  <div className="text-[11px] text-amber-600 font-medium mt-1 flex items-center gap-1">
                    <Clock size={12} /> Confirmation Statements
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
                  <div className="flex justify-between items-center text-slate-500 text-xs font-medium mb-2">
                    <span>Accounts Due</span>
                    <span className="p-2 bg-purple-50 text-purple-600 rounded-xl"><Calendar size={16} /></span>
                  </div>
                  <div className="text-3xl font-extrabold text-slate-800">{counts.accountsDueSoon}</div>
                  <div className="text-[11px] text-purple-600 font-medium mt-1 flex items-center gap-1">
                    <CheckCircle2 size={12} /> Annual Accounts
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
                  <div className="flex justify-between items-center text-slate-500 text-xs font-medium mb-2">
                    <span>Overdue Deadlines</span>
                    <span className="p-2 bg-rose-50 text-rose-600 rounded-xl"><AlertCircle size={16} /></span>
                  </div>
                  <div className="text-3xl font-extrabold text-rose-600">{counts.overdueTotal}</div>
                  <div className="text-[11px] text-rose-500 font-medium mt-1 flex items-center gap-1">
                    Requires immediate action
                  </div>
                </div>
              </div>

              {/* Action Station Deadlines Table */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
                  <div>
                    <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                      <Clock size={18} className="text-indigo-600" /> Compliance Deadlines
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Statutory Confirmation Statements (CS01) and Annual Accounts filing schedule.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 font-medium">
                      {deadlines.length} obligations detected
                    </span>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                        <th className="py-3.5 px-6">Company</th>
                        <th className="py-3.5 px-6">Task</th>
                        <th className="py-3.5 px-6">Days Left</th>
                        <th className="py-3.5 px-6">Deadline</th>
                        <th className="py-3.5 px-6 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm divide-y divide-slate-100">
                      {isLoadingDeadlines ? (
                        <tr>
                          <td colSpan={5} className="py-12 text-center text-slate-400">
                            <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-indigo-500" />
                            Calculating compliance deadlines...
                          </td>
                        </tr>
                      ) : deadlines.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-16 text-center">
                            <div className="max-w-md mx-auto space-y-3">
                              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                                <CheckCircle2 size={24} />
                              </div>
                              <h3 className="text-base font-bold text-slate-800">No Pending Deadlines</h3>
                              <p className="text-xs text-slate-500">
                                All your corporate clients are up to date with their Confirmation Statements and Annual Accounts filings.
                              </p>
                              <div className="pt-2">
                                <button
                                  onClick={() => {
                                    setAddMode("ch_download");
                                    setShowAddCompanyModal(true);
                                  }}
                                  className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                                >
                                  + Download a Company from Companies House
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        deadlines.map((item: any) => (
                          <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                            <td className="py-3.5 px-6">
                              <div className="font-semibold text-slate-800 hover:text-indigo-600 cursor-pointer" onClick={() => navigate(`/company-secretarial/${item.clientId}`)}>
                                {item.companyName}
                              </div>
                              <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                                <span>CRN: {item.companyRegNo || "Pending"}</span>
                                {item.registeredEmail && <span>&bull; {item.registeredEmail}</span>}
                              </div>
                            </td>
                            <td className="py-3.5 px-6">
                              <span className="font-medium text-slate-700">{item.task}</span>
                            </td>
                            <td className="py-3.5 px-6">
                              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${item.daysLeft < 0
                                ? "bg-rose-50 text-rose-700 border-rose-200"
                                : item.daysLeft <= 30
                                  ? "bg-amber-50 text-amber-700 border-amber-200"
                                  : "bg-emerald-50 text-emerald-700 border-emerald-200"
                                }`}>
                                {item.daysLeft < 0
                                  ? `${Math.abs(item.daysLeft)} days overdue`
                                  : `${item.daysLeft} days left`}
                              </span>
                            </td>
                            <td className="py-3.5 px-6 font-semibold text-slate-700">
                              {new Date(item.deadlineDate).toLocaleDateString("en-GB", { day: '2-digit', month: 'short', year: 'numeric' })}
                            </td>
                            <td className="py-3.5 px-6 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => rollDeadline.mutate({ clientId: item.clientId, taskType: item.taskType })}
                                  disabled={rollDeadline.isPending}
                                  className="px-2.5 py-1 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-200 transition-colors cursor-pointer"
                                  title="Rollover deadline by 1 year"
                                >
                                  Roll date +1 yr
                                </button>
                                <button
                                  onClick={() => navigate(`/company-secretarial/${item.clientId}`)}
                                  className="px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                >
                                  Manage &rarr;
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
          )}

          {/* TAB 2: COMPANIES LIST */}
          {currentTab === "companies" && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row justify-between gap-4 bg-slate-50/50">
                <div className="relative w-full sm:max-w-sm">
                  <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search company by name or registration number..."
                    className="w-full pl-10 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all bg-white"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleExport}
                    className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <Download size={14} /> Export CSV
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                      <th className="py-3.5 px-6">Company Name</th>
                      <th className="py-3.5 px-6">Reg No. (CRN)</th>
                      <th className="py-3.5 px-6">Type</th>
                      <th className="py-3.5 px-6">Registered Address</th>
                      <th className="py-3.5 px-6">Status</th>
                      <th className="py-3.5 px-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm divide-y divide-slate-100">
                    {isLoadingClients ? (
                      <tr><td colSpan={6} className="py-12 text-center text-slate-400">Loading companies...</td></tr>
                    ) : filteredClients.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-16 text-center">
                          <div className="max-w-md mx-auto space-y-3">
                            <div className="w-12 h-12 bg-slate-100 text-slate-500 rounded-full flex items-center justify-center mx-auto">
                              <Building2 size={24} />
                            </div>
                            <h3 className="text-base font-bold text-slate-800">No Corporate Clients Found</h3>
                            <p className="text-xs text-slate-500">
                              You have not added any limited companies to your practice yet.
                            </p>
                            <div className="pt-2 flex justify-center gap-2">
                              <button
                                onClick={() => {
                                  setAddMode("ch_download");
                                  setShowAddCompanyModal(true);
                                }}
                                className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors cursor-pointer"
                              >
                                Download from Companies House
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredClients.map((c: any) => (
                        <tr key={c.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-4 px-6 font-semibold text-slate-800">
                            <span
                              onClick={() => navigate(`/company-secretarial/${c.id}`)}
                              className="hover:text-indigo-600 cursor-pointer"
                            >
                              {c.clientName}
                            </span>
                          </td>
                          <td className="py-4 px-6 font-mono text-xs text-slate-600 font-medium">
                            {c.registrationNumber ? (
                              <a
                                href={`https://find-and-update.company-information.service.gov.uk/company/${c.registrationNumber}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-indigo-600 hover:underline flex items-center gap-1"
                              >
                                {c.registrationNumber} <ExternalLink size={12} />
                              </a>
                            ) : (
                              <span className="text-slate-400">Pending</span>
                            )}
                          </td>
                          <td className="py-4 px-6 text-xs text-slate-600 font-medium">
                            {c.clientType || "Limited"}
                          </td>
                          <td className="py-4 px-6 text-xs text-slate-500 max-w-xs truncate">
                            {c.address || "Not specified"}
                          </td>
                          <td className="py-4 px-6">
                            <span className="text-[11px] font-bold px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200">
                              Active
                            </span>
                          </td>
                          <td className="py-4 px-6 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {c.registrationNumber && (
                                <button
                                  onClick={() => syncCompanyData.mutate(c.id)}
                                  disabled={syncCompanyData.isPending}
                                  className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors cursor-pointer"
                                  title="Sync live Companies House data"
                                >
                                  <RefreshCw size={14} className={syncCompanyData.isPending ? "animate-spin" : ""} />
                                </button>
                              )}
                              <button
                                onClick={() => navigate(`/company-secretarial/${c.id}`)}
                                className="px-3 py-1.5 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-900 rounded-lg transition-colors cursor-pointer shadow-2xs"
                              >
                                Workspace
                              </button>
                              <button
                                onClick={() => deleteClient.mutate(c.id)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                                title="Remove company"
                              >
                                <Trash2 size={14} />
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
          )}

          {/* TAB: PEOPLE / PERSON DIRECTORY (Capium Articles 9000203190 & 9000202625) */}
          {currentTab === "people" && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row justify-between gap-4 bg-slate-50/50">
                <div className="relative w-full sm:max-w-sm">
                  <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search person by name or company..."
                    className="w-full pl-10 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all bg-white"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 font-medium">
                    Total Individuals &amp; Corporate Entities: <strong className="text-slate-800">{people.length}</strong>
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                      <th className="py-3.5 px-6">Person / Entity Name</th>
                      <th className="py-3.5 px-6">Associated Company</th>
                      <th className="py-3.5 px-6">Classification</th>
                      <th className="py-3.5 px-6">Role / Nature of Control</th>
                      <th className="py-3.5 px-6">Email / Contact</th>
                      <th className="py-3.5 px-6">Status</th>
                      <th className="py-3.5 px-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm divide-y divide-slate-100">
                    {isLoadingPeople ? (
                      <tr><td colSpan={7} className="py-12 text-center text-slate-400">Loading people directory...</td></tr>
                    ) : people.filter((p: any) =>
                      p.name?.toLowerCase().includes(search.toLowerCase()) ||
                      p.companyName?.toLowerCase().includes(search.toLowerCase())
                    ).length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-16 text-center">
                          <div className="max-w-md mx-auto space-y-3">
                            <div className="w-12 h-12 bg-slate-100 text-slate-500 rounded-full flex items-center justify-center mx-auto">
                              <Users size={24} />
                            </div>
                            <h3 className="text-base font-bold text-slate-800">No People Records Found</h3>
                            <p className="text-xs text-slate-500">
                              Officers, shareholders, and PSCs from your managed companies will appear here automatically.
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      people
                        .filter((p: any) =>
                          p.name?.toLowerCase().includes(search.toLowerCase()) ||
                          p.companyName?.toLowerCase().includes(search.toLowerCase())
                        )
                        .map((p: any) => (
                          <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                            <td className="py-4 px-6 font-semibold text-slate-800">
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 bg-slate-100 text-slate-700 rounded-full flex items-center justify-center text-xs font-bold">
                                  {p.name.charAt(0)}
                                </div>
                                <span>{p.name}</span>
                              </div>
                            </td>
                            <td className="py-4 px-6">
                              <span
                                onClick={() => navigate(`/company-secretarial/${p.clientId}`)}
                                className="font-semibold text-indigo-600 hover:underline cursor-pointer"
                              >
                                {p.companyName}
                              </span>
                              {p.companyRegNo && (
                                <span className="block text-[11px] font-mono text-slate-400">{p.companyRegNo}</span>
                              )}
                            </td>
                            <td className="py-4 px-6">
                              <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${p.type === "Officer"
                                ? "bg-blue-50 text-blue-700 border-blue-200"
                                : p.type === "Shareholder"
                                  ? "bg-purple-50 text-purple-700 border-purple-200"
                                  : "bg-amber-50 text-amber-700 border-amber-200"
                                }`}>
                                {p.type}
                              </span>
                            </td>
                            <td className="py-4 px-6 text-xs text-slate-600">
                              {p.role || "Director"}
                            </td>
                            <td className="py-4 px-6 text-xs text-slate-500 font-mono">
                              {p.email || <span className="text-slate-400 italic">Not set</span>}
                            </td>
                            <td className="py-4 px-6">
                              <span className="text-[11px] font-bold px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200">
                                {p.isActive !== false ? "Active" : "Resigned"}
                              </span>
                            </td>
                            <td className="py-4 px-6 text-right">
                              <button
                                onClick={() => navigate(`/company-secretarial/${p.clientId}`)}
                                className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                              >
                                View Company &rarr;
                              </button>
                            </td>
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB: FORMATIONS (Capium Articles 9000175603, 9000238267, 9000238435) */}
          {currentTab === "formations" && (
            <div className="space-y-6 max-w-5xl mx-auto">
              {/* Product Card Selection matching Capium img_4 */}
              <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                  <div>
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                      <FilePlus className="text-indigo-600" size={20} /> Select a Formation Product
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Choose incorporation package for direct Companies House registration.
                    </p>
                  </div>
                  <button
                    onClick={() => navigate("/company-secretarial/formations/new")}
                    className="px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs flex items-center gap-2 transition-colors cursor-pointer self-start sm:self-auto"
                  >
                    <Plus size={15} /> Launch Formation Wizard
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
                  <div className="p-4 border-2 border-indigo-500/30 bg-indigo-50/20 rounded-xl flex items-start gap-3">
                    <input type="radio" checked readOnly className="mt-1 text-indigo-600" />
                    <div>
                      <div className="text-xs font-bold text-slate-800">Own Officers &amp; Shareholders</div>
                      <p className="text-xs text-slate-500 mt-1">
                        Form a company with your client&apos;s own named directors, shareholders, and PSCs (Private Ltd by shares, guarantee, or LLP).
                      </p>
                    </div>
                  </div>

                  <div className="p-4 border border-slate-200 bg-slate-50/50 rounded-xl flex items-start gap-3 opacity-80">
                    <input type="radio" disabled className="mt-1" />
                    <div>
                      <div className="text-xs font-bold text-slate-700">Nominee Officers &amp; Registered Office</div>
                      <p className="text-xs text-slate-500 mt-1">
                        Form with professional SanSuite nominee services and managed UK address facility.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Statutory Pricing Table matching Article 9000238267 */}
              <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
                <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                  <Landmark className="text-slate-600" size={16} /> Statutory Formation Fees &amp; Turnaround Times
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-center">
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                    <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Private Limited (Ltd)</div>
                    <div className="text-2xl font-black text-slate-800 mt-1">&pound;133.00</div>
                    <div className="text-[11px] text-slate-500 mt-1">Standard 24-48h turnaround</div>
                  </div>

                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                    <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Class Shares / Other Types</div>
                    <div className="text-2xl font-black text-slate-800 mt-1">&pound;143.00</div>
                    <div className="text-[11px] text-slate-500 mt-1">Multiple share classes / LLP</div>
                  </div>

                  <div className="p-4 bg-indigo-50/50 border border-indigo-200 rounded-xl">
                    <div className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider">Same Day Limited</div>
                    <div className="text-2xl font-black text-indigo-900 mt-1">&pound;229.00</div>
                    <div className="text-[11px] text-indigo-600 mt-1">Submitted before 3 PM</div>
                  </div>

                  <div className="p-4 bg-indigo-50/50 border border-indigo-200 rounded-xl">
                    <div className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider">Same Day Class Shares</div>
                    <div className="text-2xl font-black text-indigo-900 mt-1">&pound;239.00</div>
                    <div className="text-[11px] text-indigo-600 mt-1">Express expedited review</div>
                  </div>
                </div>
              </div>

              {/* Statutory Legal Rules & ECCTA Overview matching Article 9000238435 */}
              <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
                <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                  <AlertCircle className="text-amber-600" size={16} /> UK Companies Act 2006 &amp; ECCTA 2024 Name Restrictions
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-600">
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                    <div className="font-bold text-slate-800">1. Mandatory Legal Ending</div>
                    <p>Names must end with &apos;Limited&apos;, &apos;Ltd&apos;, &apos;LLP&apos;, &apos;PLC&apos; or Welsh equivalent (&apos;Cyfyngedig&apos; / &apos;Cyf&apos;).</p>
                  </div>
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                    <div className="font-bold text-slate-800">2. Prohibited Sensitive Words</div>
                    <p>Words like &apos;Royal&apos;, &apos;King&apos;, &apos;Queen&apos;, &apos;Bank&apos;, &apos;Police&apos;, &apos;NHS&apos;, or &apos;Government&apos; require approval.</p>
                  </div>
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                    <div className="font-bold text-slate-800">3. &apos;Same As&apos; Prohibition</div>
                    <p>Names identical or confusingly similar to an existing entity on the Companies House register will be rejected.</p>
                  </div>
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                    <div className="font-bold text-slate-800">4. ECCTA 2024 Registered Email</div>
                    <p>Every UK company must provide a verified appropriate email address for statutory government correspondence.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: SUBMISSIONS (E-FILING LOG) */}
          {currentTab === "submissions" && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div>
                  <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                    <Send size={18} className="text-indigo-600" /> Companies House E-Filing Submissions
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Live submission trail of CS01 Confirmation Statements and IN01 Formations.
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                      <th className="py-3.5 px-6">Company</th>
                      <th className="py-3.5 px-6">Form Type</th>
                      <th className="py-3.5 px-6">Transaction ID</th>
                      <th className="py-3.5 px-6">Submission No.</th>
                      <th className="py-3.5 px-6">Submitted Date</th>
                      <th className="py-3.5 px-6">Status</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm divide-y divide-slate-100">
                    {isLoadingFilings ? (
                      <tr><td colSpan={6} className="py-12 text-center text-slate-400">Loading submissions...</td></tr>
                    ) : filings.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-16 text-center text-slate-500 text-xs">
                          No Companies House submissions logged yet.
                        </td>
                      </tr>
                    ) : (
                      filings.map((f: any) => (
                        <tr key={f.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3.5 px-6 font-semibold text-slate-800">
                            {f.companyName}
                          </td>
                          <td className="py-3.5 px-6 font-bold text-indigo-700 text-xs">
                            {f.formType}
                          </td>
                          <td className="py-3.5 px-6 font-mono text-xs text-slate-600">
                            {f.transactionId || "—"}
                          </td>
                          <td className="py-3.5 px-6 font-mono text-xs text-slate-600">
                            {f.submissionNumber || "—"}
                          </td>
                          <td className="py-3.5 px-6 text-xs text-slate-500">
                            {new Date(f.submissionDate).toLocaleString("en-GB")}
                          </td>
                          <td className="py-3.5 px-6">
                            <span className="text-[11px] font-bold px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200">
                              {f.status || "Accepted"}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* 2-MODE ADD COMPANY MODAL */}
        {showAddCompanyModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 animate-in fade-in duration-150">
              {/* Modal Header */}
              <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Building2 size={20} className="text-indigo-400" />
                  <h3 className="font-bold text-base">Add a Company to SanSuite</h3>
                </div>
                <button
                  onClick={() => {
                    setShowAddCompanyModal(false);
                    setChPreviewData(null);
                  }}
                  className="text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Mode Toggle Buttons */}
              <div className="p-6 border-b border-slate-100 bg-slate-50/70 flex gap-2">
                <button
                  onClick={() => setAddMode("ch_download")}
                  className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${addMode === "ch_download"
                    ? "bg-white text-indigo-700 shadow-xs border border-indigo-200"
                    : "text-slate-600 hover:bg-slate-200/60"
                    }`}
                >
                  <Download size={15} /> Download from Companies House
                </button>
                <button
                  onClick={() => setAddMode("type_own")}
                  className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${addMode === "type_own"
                    ? "bg-white text-indigo-700 shadow-xs border border-indigo-200"
                    : "text-slate-600 hover:bg-slate-200/60"
                    }`}
                >
                  <Plus size={15} /> Type Your Own Data
                </button>
              </div>

              {/* MODE 1: DOWNLOAD FROM COMPANIES HOUSE */}
              {addMode === "ch_download" && (
                <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
                  <p className="text-xs text-slate-500">
                    Enter the company registration number (CRN) to fetch and preview the authentic profile from Companies House before importing.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Company Number *</label>
                      <input
                        type="text"
                        placeholder="e.g. 08438321"
                        value={chCompanyNumber}
                        onChange={(e) => setChCompanyNumber(e.target.value)}
                        className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Filing Code (6-digit)</label>
                      <input
                        type="password"
                        placeholder="Auth code"
                        maxLength={6}
                        value={chFilingCode}
                        onChange={(e) => setChFilingCode(e.target.value)}
                        className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono"
                      />
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-1">
                    <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={overwritePeople}
                        onChange={(e) => setOverwritePeople(e.target.checked)}
                        className="rounded text-indigo-600"
                      />
                      Overwrite matching people on SanSuite with Companies House data
                    </label>
                    <button
                      onClick={handleLookupCh}
                      disabled={isSearchingCh}
                      className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {isSearchingCh ? <RefreshCw size={13} className="animate-spin" /> : <Search size={13} />}
                      Lookup Company
                    </button>
                  </div>

                  {/* PREVIEW CARD */}
                  {chPreviewData && chPreviewData.profile && (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-3 mt-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                            Companies House Verified
                          </span>
                          <h4 className="text-base font-bold text-slate-900 mt-1">{chPreviewData.profile.company_name}</h4>
                          <p className="text-xs text-slate-500">
                            CRN: <span className="font-mono font-semibold text-slate-700">{chPreviewData.profile.company_number}</span> &bull; {chPreviewData.profile.type || "Limited"}
                          </p>
                        </div>
                        <span className="text-xs font-bold px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full">
                          {chPreviewData.profile.company_status}
                        </span>
                      </div>

                      <div className="text-xs text-slate-600 border-t border-slate-200/60 pt-2 space-y-1">
                        <div><strong>Registered Office:</strong> {Object.values(chPreviewData.profile.registered_office_address || {}).filter(Boolean).join(", ")}</div>
                        <div className="grid grid-cols-2 gap-2 pt-1 text-slate-500">
                          <div><strong>Officers:</strong> {chPreviewData.officers?.length || 0} active</div>
                          <div><strong>PSCs:</strong> {chPreviewData.psc?.length || 0} registered</div>
                          <div><strong>Next CS Due:</strong> {chPreviewData.profile.confirmation_statement?.next_due || "N/A"}</div>
                          <div><strong>Next Accounts Due:</strong> {chPreviewData.profile.accounts?.next_accounts?.due_on || "N/A"}</div>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                        <button
                          onClick={() => setChPreviewData(null)}
                          className="px-3.5 py-1.5 text-xs text-slate-600 hover:bg-slate-200 rounded-xl cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => importFromCh.mutate()}
                          disabled={importFromCh.isPending}
                          className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50"
                        >
                          {importFromCh.isPending ? <RefreshCw size={13} className="animate-spin" /> : <Download size={13} />}
                          Confirm & Download Company
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* MODE 2: TYPE YOUR OWN DATA */}
              {addMode === "type_own" && (
                <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Company Name *</label>
                      <input
                        type="text"
                        placeholder="e.g. Apex Global Solutions Ltd"
                        value={manualForm.companyName}
                        onChange={(e) => setManualForm({ ...manualForm, companyName: e.target.value })}
                        className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Company Type *</label>
                      <select
                        value={manualForm.companyType}
                        onChange={(e) => setManualForm({ ...manualForm, companyType: e.target.value })}
                        className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
                      >
                        <option value="Limited">Private Limited Company (Ltd)</option>
                        <option value="LLP">Limited Liability Partnership (LLP)</option>
                        <option value="PLC">Public Limited Company (PLC)</option>
                        <option value="Limited by Guarantee">Limited by Guarantee</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Company Number (CRN)</label>
                      <input
                        type="text"
                        placeholder="Optional if new"
                        value={manualForm.companyRegNo}
                        onChange={(e) => setManualForm({ ...manualForm, companyRegNo: e.target.value })}
                        className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Registered Office Address *</label>
                      <textarea
                        rows={2}
                        placeholder="Full registered office street and town address"
                        value={manualForm.registeredAddress}
                        onChange={(e) => setManualForm({ ...manualForm, registeredAddress: e.target.value })}
                        className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Country *</label>
                      <input
                        type="text"
                        value={manualForm.country}
                        onChange={(e) => setManualForm({ ...manualForm, country: e.target.value })}
                        className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-slate-50"
                        readOnly
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">SIC Code *</label>
                      <input
                        type="text"
                        placeholder="e.g. 62020"
                        value={manualForm.sicCode}
                        onChange={(e) => setManualForm({ ...manualForm, sicCode: e.target.value })}
                        className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                        Registered Email Address (ECCTA 2024 Requirement)
                      </label>
                      <input
                        type="email"
                        placeholder="official@company.co.uk"
                        value={manualForm.registeredEmail}
                        onChange={(e) => setManualForm({ ...manualForm, registeredEmail: e.target.value })}
                        className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-200 flex justify-end gap-2">
                    <button
                      onClick={() => setShowAddCompanyModal(false)}
                      className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => saveManualCompany.mutate()}
                      disabled={saveManualCompany.isPending}
                      className="px-5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
                    >
                      {saveManualCompany.isPending ? <RefreshCw size={13} className="animate-spin" /> : <Check size={13} />}
                      Save Company
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* MY OFFICE / SETTINGS MODAL */}
        {showSettingsModal && (
          <SettingsModal
            initialSettings={settingsData?.settings}
            onClose={() => setShowSettingsModal(false)}
          />
        )}
      </div>
    </AppLayout>
  );
}

// Subcomponent: My Office / Secretarial Settings Modal
function SettingsModal({ initialSettings, onClose }: { initialSettings: any, onClose: () => void }) {
  const { toast } = useToast();
  const [presenterId, setPresenterId] = useState(initialSettings?.presenterId || "");
  const [presenterAuthCode, setPresenterAuthCode] = useState(initialSettings?.presenterAuthCode || "");
  const [defaultRegisteredOffice, setDefaultRegisteredOffice] = useState(initialSettings?.defaultRegisteredOffice || "");
  const [defaultCountry, setDefaultCountry] = useState(initialSettings?.defaultCountry || "United Kingdom");
  const [isLiveMode, setIsLiveMode] = useState(initialSettings?.isLiveMode || false);

  const saveSettings = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/company-secretarial/settings", {
        presenterId,
        presenterAuthCode,
        defaultRegisteredOffice,
        defaultCountry,
        isLiveMode
      });
      if (!res.ok) throw new Error("Failed to save settings");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Settings Saved", description: "Companies House presenter credentials updated.", type: "success" });
      queryClient.invalidateQueries({ queryKey: ["/api/company-secretarial/settings"] });
      onClose();
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, type: "error" })
  });

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings size={18} className="text-indigo-400" />
            <h3 className="font-bold text-sm">My Office &amp; E-Filing Settings</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white cursor-pointer"><X size={18} /></button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Presenter ID</label>
            <input
              type="text"
              placeholder="e.g. 00012345678"
              value={presenterId}
              onChange={(e) => setPresenterId(e.target.value)}
              className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Presenter Authentication Code</label>
            <input
              type="password"
              placeholder="Presenter Auth Code"
              value={presenterAuthCode}
              onChange={(e) => setPresenterAuthCode(e.target.value)}
              className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Default Registered Office Address</label>
            <textarea
              rows={3}
              placeholder="Firm's office address if providing registered office services..."
              value={defaultRegisteredOffice}
              onChange={(e) => setDefaultRegisteredOffice(e.target.value)}
              className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <div>
              <span className="text-xs font-bold text-slate-700 block">Live Companies House Gateway</span>
              <span className="text-[11px] text-slate-500">Toggle live filing vs simulation environment</span>
            </div>
            <input
              type="checkbox"
              checked={isLiveMode}
              onChange={(e) => setIsLiveMode(e.target.checked)}
              className="rounded text-indigo-600 w-4 h-4 cursor-pointer"
            />
          </div>

          <div className="pt-4 border-t border-slate-200 flex justify-end gap-2">
            <button onClick={onClose} className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer">
              Cancel
            </button>
            <button
              onClick={() => saveSettings.mutate()}
              disabled={saveSettings.isPending}
              className="px-5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              Save Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
