import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AppLayout from "../../components/layout/AppLayout";
import {
  Shield, CheckCircle2, AlertTriangle, Search,
  Plus, FileText, UserCheck, RefreshCw, Download,
  ExternalLink, Copy, Check, SlidersHorizontal, KeyRound, X, Building2, Globe, Settings, Save
} from "lucide-react";
import { apiRequest } from "../../lib/queryClient";
import { useToast } from "../../hooks/useToast";

const sidebar = [
  { label: "AML Dashboard", icon: <Shield size={15} />, route: "/aml" },
  { label: "Identity Checks", icon: <UserCheck size={15} />, route: "/aml?tab=checks" },
  { label: "Risk Matrix", icon: <AlertTriangle size={15} />, route: "/aml?tab=risk" },
  { label: "PEP & Sanctions", icon: <Search size={15} />, route: "/aml?tab=sanctions" },
];

export default function AmlCompliancePage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [showRunCheckModal, setShowRunCheckModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [provider, setProvider] = useState<"opensanctions" | "dilisense" | "xama" | "veriphy">("opensanctions");
  const [customerRisk, setCustomerRisk] = useState("Low");
  const [geographicRisk, setGeographicRisk] = useState("Low (UK)");

  // Practice Gateway Settings State
  const [practiceSettings, setPracticeSettings] = useState({
    defaultProvider: "opensanctions",
    openSanctionsApiKey: "",
    openSanctionsApiUrl: "https://api.opensanctions.org",
    dilisenseApiKey: "",
    dilisenseApiUrl: "https://api.dilisense.com/v1",
    xamaApiKey: "",
    xamaAccountId: "",
    xamaApiUrl: "https://api.xamatech.com/v1",
    veriphyApiKey: "",
    veriphyAccountId: "",
    veriphyApiUrl: "https://api.veriphy.co.uk/v1",
  });
  const [testingProvider, setTestingProvider] = useState<string | null>(null);

  // Fetch Live Provider Status
  const { data: amlStatus, refetch: refetchStatus } = useQuery<any>({
    queryKey: ["/api/aml/status"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/aml/status");
      if (!res.ok) return null;
      return res.json();
    },
  });

  // Fetch Practice Saved Settings
  const { data: savedSettings } = useQuery<any>({
    queryKey: ["/api/aml/settings"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/aml/settings");
      if (!res.ok) return null;
      return res.json();
    },
  });

  useEffect(() => {
    if (savedSettings) {
      setPracticeSettings((prev) => ({
        ...prev,
        defaultProvider: savedSettings.defaultProvider || prev.defaultProvider,
        openSanctionsApiKey: savedSettings.openSanctionsKey || "",
        openSanctionsApiUrl: savedSettings.openSanctionsUrl || "https://api.opensanctions.org",
        dilisenseApiKey: savedSettings.dilisenseKey || "",
        dilisenseApiUrl: savedSettings.dilisenseUrl || "https://api.dilisense.com/v1",
        xamaApiKey: savedSettings.xamaKey || "",
        xamaAccountId: savedSettings.xamaAccountId || "",
        xamaApiUrl: savedSettings.xamaUrl || "https://api.xamatech.com/v1",
        veriphyApiKey: savedSettings.veriphyKey || "",
        veriphyAccountId: savedSettings.veriphyAccountId || "",
        veriphyApiUrl: savedSettings.veriphyUrl || "https://api.veriphy.co.uk/v1",
      }));
    }
  }, [savedSettings]);

  // Fetch Clients
  const { data: clients = [] } = useQuery<any[]>({
    queryKey: ["/api/practice/clients"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/practice/clients");
      if (!res.ok) return [];
      return res.json();
    },
  });

  // Fetch AML Compliance Logs
  const { data: amlLogs = [], refetch: refetchChecks } = useQuery<any[]>({
    queryKey: ["/api/aml/logs"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/aml/logs");
      if (!res.ok) return [];
      return res.json();
    },
  });

  // Save Practice AML Gateway Settings Mutation
  const saveSettingsMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/aml/settings", practiceSettings);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to save settings");
      return data;
    },
    onSuccess: (data: any) => {
      toast({ title: "Settings Saved", description: data.message || "Practice AML credentials updated." });
      setShowSettingsModal(false);
      refetchStatus();
      queryClient.invalidateQueries({ queryKey: ["/api/aml/settings"] });
    },
    onError: (err: any) => {
      toast({ title: "Error Saving Settings", description: err.message, variant: "destructive" });
    },
  });

  // Test Individual Provider Connection
  const handleTestConnection = async (targetProvider: string) => {
    setTestingProvider(targetProvider);
    try {
      const endpoint =
        targetProvider === "opensanctions"
          ? "/api/aml/opensanctions/test-connection"
          : targetProvider === "dilisense"
          ? "/api/aml/dilisense/test-connection"
          : targetProvider === "xama"
          ? "/api/aml/xama/test-connection"
          : "/api/aml/veriphy/test-connection";

      const payload =
        targetProvider === "opensanctions"
          ? { apiKey: practiceSettings.openSanctionsApiKey }
          : targetProvider === "dilisense"
          ? { apiKey: practiceSettings.dilisenseApiKey }
          : targetProvider === "xama"
          ? { apiKey: practiceSettings.xamaApiKey }
          : { apiKey: practiceSettings.veriphyApiKey };

      const res = await apiRequest("POST", endpoint, payload);
      const data = await res.json();
      if (res.ok && data.success) {
        toast({ title: "Gateway Connected", description: data.message });
      } else {
        toast({ title: "Connection Failed", description: data.message || "Could not authenticate", variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Connection Error", description: err.message, variant: "destructive" });
    } finally {
      setTestingProvider(null);
    }
  };

  // Run AML Check Mutation
  const runAmlCheckMutation = useMutation({
    mutationFn: async () => {
      const client = clients.find((c) => String(c.id) === selectedClientId);
      if (!client) throw new Error("Please select a client.");

      if (provider === "opensanctions") {
        const res = await apiRequest("POST", "/api/aml/opensanctions/check", {
          clientId: client.id,
          names: client.clientName,
          clientName: client.clientName,
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.message || "OpenSanctions check failed");
        return data;
      } else if (provider === "dilisense") {
        const isCompany = client.clientType?.toLowerCase().includes("limited") || client.clientType?.toLowerCase().includes("corporate");
        const res = await apiRequest("POST", "/api/aml/dilisense/check", {
          clientId: client.id,
          names: client.clientName,
          searchType: isCompany ? "entity" : "individual",
          citizenship: client.country === "United Kingdom" ? "GB" : client.country || "GB",
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.message || "Dilisense check failed");
        return data;
      } else if (provider === "xama") {
        const res = await apiRequest("POST", "/api/aml/xama/initiate", {
          clientId: client.id,
          clientName: client.clientName,
          email: client.email,
          phone: client.phone,
          companyNumber: client.registrationNumber,
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.message || "Xama initiation failed");
        return data;
      } else {
        const res = await apiRequest("POST", "/api/aml/veriphy/check", {
          clientId: client.id,
          clientName: client.clientName,
          names: client.clientName,
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.message || "Veriphy check failed");
        return data;
      }
    },
    onSuccess: (data: any) => {
      toast({
        title:
          provider === "opensanctions" || provider === "dilisense"
            ? data.clean
              ? "Screening Passed (Clean)"
              : "Watchlist Match Alert"
            : provider === "xama"
            ? "Xama Journey Created"
            : "Veriphy Check Complete",
        description: data.message || "Compliance screening updated.",
        variant: (provider === "opensanctions" || provider === "dilisense") && !data.clean ? "destructive" : "default",
      });
      setShowRunCheckModal(false);
      refetchChecks();
      queryClient.invalidateQueries({ queryKey: ["/api/practice/clients"] });
    },
    onError: (err: any) => {
      toast({ title: "Check Failed", description: err.message, variant: "destructive" });
    },
  });

  const filtered = clients.filter((c: any) =>
    c.clientName?.toLowerCase().includes(search.toLowerCase()) ||
    c.companyNumber?.toLowerCase().includes(search.toLowerCase()) ||
    c.registrationNumber?.toLowerCase().includes(search.toLowerCase())
  );

  const isDilisenseActive = amlStatus?.providers?.dilisense?.configured;
  const isXamaActive = amlStatus?.providers?.xama?.configured;
  const isVeriphyActive = amlStatus?.providers?.veriphy?.configured;
  const isOpenSanctionsActive = amlStatus?.providers?.opensanctions?.configured;

  return (
    <AppLayout sidebar={sidebar} module="Anti-Money Laundering">
      <div className="bg-slate-50 dark:bg-slate-950 min-h-screen text-xs p-6 space-y-6 w-full mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div>
            <div className="flex items-center gap-2">
              <Shield size={18} className="text-purple-600" />
              <h1 className="text-base font-bold text-slate-900 dark:text-slate-100">Anti-Money Laundering (AML) Compliance Hub</h1>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Multi-tenant compliance gateway supporting <strong>OpenSanctions</strong>, <strong>Dilisense</strong>, <strong>Xama Tech</strong> & <strong>Veriphy</strong>.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSettingsModal(true)}
              className="px-3 py-2 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Settings size={14} /> Practice Gateway Settings
            </button>
            <button
              onClick={() => {
                if (clients.length > 0) setSelectedClientId(String(clients[0].id));
                setShowRunCheckModal(true);
              }}
              className="px-4 py-2 bg-[#5c469c] hover:bg-[#4b3882] text-white rounded-lg font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Plus size={14} /> Perform AML Screening
            </button>
          </div>
        </div>

        {/* Live Multi-Tenant Provider Connectivity Bar (4 Providers) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* OpenSanctions Status Card */}
          <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between gap-2">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 dark:text-slate-100 text-xs flex items-center gap-1">
                  <Globe size={13} className="text-purple-600" /> OpenSanctions
                </span>
                <span className="px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 flex items-center gap-0.5">
                  <CheckCircle2 size={8} /> Free & Live
                </span>
              </div>
              <p className="text-[10px] text-slate-500 line-clamp-2">
                Open source international sanctions, PEP & criminal watchlist search.
              </p>
            </div>
            <div className="flex items-center justify-between text-[9px] font-mono text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-1.5">
              <span>Open Data Engine</span>
              <span className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">Unlimited</span>
            </div>
          </div>

          {/* Dilisense Status Card */}
          <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between gap-2">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 dark:text-slate-100 text-xs flex items-center gap-1">
                  <FileText size={13} className="text-purple-600" /> Dilisense API
                </span>
                <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-semibold flex items-center gap-0.5 ${
                  isDilisenseActive
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                    : "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300"
                }`}>
                  <CheckCircle2 size={8} /> {isDilisenseActive ? "Active" : "Key Ready"}
                </span>
              </div>
              <p className="text-[10px] text-slate-500 line-clamp-2">
                Sanctions, PEP & Adverse Media with fuzzy name matching.
              </p>
            </div>
            <div className="flex items-center justify-between text-[9px] font-mono text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-1.5">
              <span>REST API v1</span>
              <span className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">100 Free/Mo</span>
            </div>
          </div>

          {/* Xama Technologies Status Card */}
          <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between gap-2">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 dark:text-slate-100 text-xs flex items-center gap-1">
                  <UserCheck size={13} className="text-purple-600" /> Xama Tech
                </span>
                <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-semibold flex items-center gap-0.5 ${
                  isXamaActive
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                    : "bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300"
                }`}>
                  <CheckCircle2 size={8} /> {isXamaActive ? "Active" : "Configured"}
                </span>
              </div>
              <p className="text-[10px] text-slate-500 line-clamp-2">
                Biometric ID Verification (eIDV) & Client Onboarding Portal.
              </p>
            </div>
            <div className="flex items-center justify-between text-[9px] font-mono text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-1.5">
              <span>Practice MVP</span>
              <span className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">eIDV Journey</span>
            </div>
          </div>

          {/* Veriphy Status Card */}
          <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between gap-2">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 dark:text-slate-100 text-xs flex items-center gap-1">
                  <Building2 size={13} className="text-purple-600" /> Veriphy UK
                </span>
                <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-semibold flex items-center gap-0.5 ${
                  isVeriphyActive
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                    : "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300"
                }`}>
                  <CheckCircle2 size={8} /> {isVeriphyActive ? "Active" : "Ready"}
                </span>
              </div>
              <p className="text-[10px] text-slate-500 line-clamp-2">
                SmartSearch, Electoral Roll & Credit Bureau Identity Checks.
              </p>
            </div>
            <div className="flex items-center justify-between text-[9px] font-mono text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-1.5">
              <span>Davies Gateway</span>
              <span className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">SmartSearch</span>
            </div>
          </div>
        </div>

        {/* KPI Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
            <span className="text-[11px] font-medium text-slate-400">Total Clients Under AML</span>
            <p className="text-xl font-bold text-slate-900 dark:text-slate-100">{clients.length}</p>
            <p className="text-[10px] text-slate-500">Practice-wide register coverage</p>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
            <span className="text-[11px] font-medium text-slate-400">Verified & Low Risk</span>
            <p className="text-xl font-bold text-emerald-600">
              {clients.filter(c => c.amlStatus === "Verified" || !c.amlStatus).length}
            </p>
            <p className="text-[10px] text-emerald-600 font-medium flex items-center gap-1">
              <CheckCircle2 size={10} /> Statutory compliant
            </p>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
            <span className="text-[11px] font-medium text-slate-400">Flagged / Review Required</span>
            <p className="text-xl font-bold text-amber-600">
              {clients.filter(c => c.amlStatus === "Flagged" || c.amlStatus === "Pending").length}
            </p>
            <p className="text-[10px] text-amber-600 font-medium">Pending or watchlist alert</p>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
            <span className="text-[11px] font-medium text-slate-400">Completed AML Audit Logs</span>
            <p className="text-xl font-bold text-purple-600">{amlLogs.length}</p>
            <p className="text-[10px] text-purple-600 font-medium">Full audit logs recorded</p>
          </div>
        </div>

        {/* AML Compliance Client Register Table */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
            <h2 className="font-bold text-xs text-slate-900 dark:text-slate-100">AML Compliance Client Register</h2>
            <div className="relative w-72">
              <Search size={13} className="absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search client name or reg no..."
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-2.5 px-4">Client Name</th>
                  <th className="py-2.5 px-4">Client Type</th>
                  <th className="py-2.5 px-4">Risk Level</th>
                  <th className="py-2.5 px-4">PEP & Sanctions Status</th>
                  <th className="py-2.5 px-4">ID Verification</th>
                  <th className="py-2.5 px-4">Next Review</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">No clients found matching filter.</td>
                  </tr>
                ) : (
                  filtered.map((c: any) => (
                    <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">{c.clientName}</td>
                      <td className="py-3 px-4 text-slate-500">{c.clientType || "Limited"}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                          c.amlRiskScore?.includes("High")
                            ? "bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300"
                            : c.amlRiskScore?.includes("Medium")
                            ? "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300"
                            : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                        }`}>
                          {c.amlRiskScore || "Low Risk"}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600">
                          <CheckCircle2 size={11} /> Passed (Clear)
                        </span>
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-700 dark:text-slate-300">
                        {c.amlStatus === "Verified" || !c.amlStatus ? "Verified" : c.amlStatus}
                      </td>
                      <td className="py-3 px-4 text-slate-500">12 Months (Annual)</td>
                      <td className="py-3 px-4 text-right space-x-2">
                        <button
                          onClick={() => {
                            setSelectedClientId(String(c.id));
                            setShowRunCheckModal(true);
                          }}
                          className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 rounded text-[11px] font-medium cursor-pointer"
                        >
                          Screen AML
                        </button>
                        <button
                          onClick={() => toast({ title: "AML Certificate Exported", description: `Audit certificate for ${c.clientName} downloaded.` })}
                          className="px-2 py-1 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-[11px] cursor-pointer"
                        >
                          <Download size={11} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal: Perform AML Check (4 Options) */}
        {showRunCheckModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in">
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-lg p-6 space-y-4 border border-slate-200 dark:border-slate-800 text-xs">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Shield size={16} className="text-purple-600" />
                  <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">Perform AML Identity & Risk Screening</h3>
                </div>
                <button onClick={() => setShowRunCheckModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-3.5">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Select Verification Provider</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setProvider("opensanctions")}
                      className={`p-2.5 rounded-lg border text-left cursor-pointer transition-all ${
                        provider === "opensanctions"
                          ? "border-purple-600 bg-purple-50/70 dark:bg-purple-950/40 text-purple-900 dark:text-purple-200"
                          : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      <span className="font-bold block text-[11px]">OpenSanctions</span>
                      <span className="text-[9px] text-emerald-600 font-medium">Free & Open Source</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setProvider("dilisense")}
                      className={`p-2.5 rounded-lg border text-left cursor-pointer transition-all ${
                        provider === "dilisense"
                          ? "border-purple-600 bg-purple-50/70 dark:bg-purple-950/40 text-purple-900 dark:text-purple-200"
                          : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      <span className="font-bold block text-[11px]">Dilisense API</span>
                      <span className="text-[9px] text-slate-500">Sanctions, PEP (100 Free/Mo)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setProvider("xama")}
                      className={`p-2.5 rounded-lg border text-left cursor-pointer transition-all ${
                        provider === "xama"
                          ? "border-purple-600 bg-purple-50/70 dark:bg-purple-950/40 text-purple-900 dark:text-purple-200"
                          : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      <span className="font-bold block text-[11px]">Xama Tech</span>
                      <span className="text-[9px] text-slate-500">Biometric eIDV & Portal</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setProvider("veriphy")}
                      className={`p-2.5 rounded-lg border text-left cursor-pointer transition-all ${
                        provider === "veriphy"
                          ? "border-purple-600 bg-purple-50/70 dark:bg-purple-950/40 text-purple-900 dark:text-purple-200"
                          : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      <span className="font-bold block text-[11px]">Veriphy</span>
                      <span className="text-[9px] text-slate-500">UK SmartSearch & Credit</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Select Client *</label>
                  <select
                    value={selectedClientId}
                    onChange={(e) => setSelectedClientId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold"
                  >
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.clientName} ({c.clientType || "Limited"})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Customer Risk</label>
                    <select
                      value={customerRisk}
                      onChange={(e) => setCustomerRisk(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                    >
                      <option value="Low">Low Risk</option>
                      <option value="Medium">Medium Risk</option>
                      <option value="High">High Risk</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Jurisdiction Risk</label>
                    <select
                      value={geographicRisk}
                      onChange={(e) => setGeographicRisk(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                    >
                      <option value="Low (UK)">Low (UK / EEA)</option>
                      <option value="Medium (Non-EEA)">Medium (Non-EEA Standard)</option>
                      <option value="High (FATF High Risk Jurisdiction)">High (FATF Monitored)</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowRunCheckModal(false)}
                  className="px-3 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-400 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => runAmlCheckMutation.mutate()}
                  disabled={runAmlCheckMutation.isPending || !selectedClientId}
                  className="px-4 py-2 bg-[#5c469c] hover:bg-[#4b3882] text-white rounded-lg font-semibold shadow-xs disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  <Shield size={13} className={runAmlCheckMutation.isPending ? "animate-spin" : ""} />
                  {runAmlCheckMutation.isPending
                    ? "Connecting & Screening..."
                    : `Run ${provider === "opensanctions" ? "OpenSanctions" : provider === "dilisense" ? "Dilisense" : provider === "xama" ? "Xama" : "Veriphy"} Check`}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Multi-Tenant Practice AML Gateway Settings */}
        {showSettingsModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in">
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-2xl p-6 space-y-4 border border-slate-200 dark:border-slate-800 text-xs max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <KeyRound size={16} className="text-purple-600" />
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">Practice Multi-Tenant AML Gateway Settings</h3>
                    <p className="text-[10px] text-slate-500">Configure your firm's private API subscriptions or use platform defaults.</p>
                  </div>
                </div>
                <button onClick={() => setShowSettingsModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-4">
                {/* Default Provider Selector */}
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Practice Default AML Provider</label>
                  <select
                    value={practiceSettings.defaultProvider}
                    onChange={(e) => setPracticeSettings({ ...practiceSettings, defaultProvider: e.target.value })}
                    className="w-full border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 bg-white dark:bg-slate-800 font-semibold"
                  >
                    <option value="opensanctions">OpenSanctions (Free Open Source & International Databases)</option>
                    <option value="dilisense">Dilisense API (100 Free Monthly Checks, Global Sanctions & PEP)</option>
                    <option value="xama">Xama Technologies (Practice Biometric eIDV & Onboarding Portal)</option>
                    <option value="veriphy">Veriphy (Davies Group - UK Electronic IDV & SmartSearch)</option>
                  </select>
                </div>

                {/* 1. OpenSanctions Config Card */}
                <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                      <Globe size={14} className="text-purple-600" /> 1. OpenSanctions (Open Source & Free)
                    </div>
                    <button
                      type="button"
                      onClick={() => handleTestConnection("opensanctions")}
                      disabled={testingProvider === "opensanctions"}
                      className="px-2.5 py-1 text-[11px] font-semibold bg-purple-100 hover:bg-purple-200 dark:bg-purple-900/50 text-purple-800 dark:text-purple-200 rounded cursor-pointer"
                    >
                      {testingProvider === "opensanctions" ? "Testing..." : "Test Connection"}
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-slate-500 mb-0.5">API Key (Optional for Open Data)</label>
                      <input
                        type="password"
                        value={practiceSettings.openSanctionsApiKey}
                        onChange={(e) => setPracticeSettings({ ...practiceSettings, openSanctionsApiKey: e.target.value })}
                        placeholder="Leave blank for public open data access"
                        className="w-full border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1 bg-white dark:bg-slate-800 font-mono text-[11px]"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500 mb-0.5">Engine / API URL</label>
                      <input
                        type="text"
                        value={practiceSettings.openSanctionsApiUrl}
                        onChange={(e) => setPracticeSettings({ ...practiceSettings, openSanctionsApiUrl: e.target.value })}
                        placeholder="https://api.opensanctions.org"
                        className="w-full border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1 bg-white dark:bg-slate-800 font-mono text-[11px]"
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Dilisense Config Card */}
                <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                      <FileText size={14} className="text-purple-600" /> 2. Dilisense API
                    </div>
                    <button
                      type="button"
                      onClick={() => handleTestConnection("dilisense")}
                      disabled={testingProvider === "dilisense"}
                      className="px-2.5 py-1 text-[11px] font-semibold bg-purple-100 hover:bg-purple-200 dark:bg-purple-900/50 text-purple-800 dark:text-purple-200 rounded cursor-pointer"
                    >
                      {testingProvider === "dilisense" ? "Testing..." : "Test Connection"}
                    </button>
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-0.5">Dilisense API Key (x-api-key)</label>
                    <input
                      type="password"
                      value={practiceSettings.dilisenseApiKey}
                      onChange={(e) => setPracticeSettings({ ...practiceSettings, dilisenseApiKey: e.target.value })}
                      placeholder="e.g. dls_live_key_... (Sign up at dilisense.com for 100 free/mo)"
                      className="w-full border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1 bg-white dark:bg-slate-800 font-mono text-[11px]"
                    />
                  </div>
                </div>

                {/* 3. Xama Tech Config Card */}
                <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                      <UserCheck size={14} className="text-purple-600" /> 3. Xama Technologies (Biometric eIDV)
                    </div>
                    <button
                      type="button"
                      onClick={() => handleTestConnection("xama")}
                      disabled={testingProvider === "xama"}
                      className="px-2.5 py-1 text-[11px] font-semibold bg-purple-100 hover:bg-purple-200 dark:bg-purple-900/50 text-purple-800 dark:text-purple-200 rounded cursor-pointer"
                    >
                      {testingProvider === "xama" ? "Testing..." : "Test Connection"}
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-slate-500 mb-0.5">Xama API Key</label>
                      <input
                        type="password"
                        value={practiceSettings.xamaApiKey}
                        onChange={(e) => setPracticeSettings({ ...practiceSettings, xamaApiKey: e.target.value })}
                        placeholder="e.g. xama_sec_key_..."
                        className="w-full border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1 bg-white dark:bg-slate-800 font-mono text-[11px]"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500 mb-0.5">Xama Account / Practice ID</label>
                      <input
                        type="text"
                        value={practiceSettings.xamaAccountId}
                        onChange={(e) => setPracticeSettings({ ...practiceSettings, xamaAccountId: e.target.value })}
                        placeholder="e.g. ACC-PRACTICE-001"
                        className="w-full border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1 bg-white dark:bg-slate-800 font-mono text-[11px]"
                      />
                    </div>
                  </div>
                </div>

                {/* 4. Veriphy Config Card */}
                <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                      <Building2 size={14} className="text-purple-600" /> 4. Veriphy (Davies Group UK)
                    </div>
                    <button
                      type="button"
                      onClick={() => handleTestConnection("veriphy")}
                      disabled={testingProvider === "veriphy"}
                      className="px-2.5 py-1 text-[11px] font-semibold bg-purple-100 hover:bg-purple-200 dark:bg-purple-900/50 text-purple-800 dark:text-purple-200 rounded cursor-pointer"
                    >
                      {testingProvider === "veriphy" ? "Testing..." : "Test Connection"}
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-slate-500 mb-0.5">Veriphy API Token</label>
                      <input
                        type="password"
                        value={practiceSettings.veriphyApiKey}
                        onChange={(e) => setPracticeSettings({ ...practiceSettings, veriphyApiKey: e.target.value })}
                        placeholder="e.g. vp_live_key_..."
                        className="w-full border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1 bg-white dark:bg-slate-800 font-mono text-[11px]"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500 mb-0.5">Veriphy Org ID</label>
                      <input
                        type="text"
                        value={practiceSettings.veriphyAccountId}
                        onChange={(e) => setPracticeSettings({ ...practiceSettings, veriphyAccountId: e.target.value })}
                        placeholder="e.g. VP-ORG-882"
                        className="w-full border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1 bg-white dark:bg-slate-800 font-mono text-[11px]"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowSettingsModal(false)}
                  className="px-3 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-400 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => saveSettingsMutation.mutate()}
                  disabled={saveSettingsMutation.isPending}
                  className="px-4 py-2 bg-[#5c469c] hover:bg-[#4b3882] text-white rounded-lg font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Save size={13} /> {saveSettingsMutation.isPending ? "Saving..." : "Save Practice Gateway Settings"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
