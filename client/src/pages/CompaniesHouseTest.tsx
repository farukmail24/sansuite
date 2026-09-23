import { useState } from "react";
import {
  Search, Building2, Calendar, FileText, Users, Shield,
  Copy, Check, ExternalLink, Download, AlertCircle, CheckCircle2,
  Clock, MapPin, Tag, Briefcase, FileCheck, Landmark, RefreshCw
} from "lucide-react";
import { apiRequest } from "../lib/queryClient";
import AppLayout from "../components/layout/AppLayout";
import { useToast } from "../hooks/useToast";
import { useAuth } from "../hooks/useAuth";
import {
  getCompanyTypeLabel,
  getCompanyStatusLabel,
  getStatusBadgeClass,
  getAccountTypeLabel,
  getOfficerRoleLabel,
  getJurisdictionLabel,
  parseSicCodes,
} from "../lib/chEnumerations";

type TabKey = "overview" | "statutory" | "officers" | "psc" | "filings" | "charges" | "raw";

export default function CompaniesHouseTest() {
  const { token } = useAuth();
  const [crn, setCrn] = useState("");
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [jsonTab, setJsonTab] = useState<"all" | "profile" | "officers" | "psc" | "filingHistory" | "charges">("all");
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleFetch = async (targetCrn?: string) => {
    const searchCrn = (targetCrn || crn).trim();
    if (!searchCrn) {
      toast({
        title: "Input Required",
        description: "Please enter a Company Registration Number (CRN)",
        variant: "destructive"
      });
      return;
    }

    if (targetCrn) setCrn(targetCrn);
    setIsLoading(true);

    try {
      const res = await apiRequest("GET", `/api/companies-house/company/${encodeURIComponent(searchCrn)}/all`);
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || `API Error (${res.status})`);
      }
      const fullData = await res.json();
      setData(fullData);
      toast({
        title: "Data Retrieved",
        description: `Successfully loaded all live data for ${fullData.profile?.company_name || searchCrn}`
      });
    } catch (err: any) {
      toast({
        title: "Failed to Fetch Data",
        description: err.message || "Could not retrieve data from Companies House",
        variant: "destructive"
      });
      setData(null);
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Copied", description: "JSON copied to clipboard" });
  };

  const downloadJson = () => {
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${data.profile?.company_number || crn}_companies_house_data.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const profile = data?.profile;
  const officers = data?.officers || [];
  const pscList = data?.psc || [];
  const filings = data?.filingHistory || [];
  const charges = data?.charges || [];

  // Calculate statutory CT600 from accounting period end
  const periodEndStr = profile?.accounts?.next_accounts?.period_end_on || profile?.accounts?.last_accounts?.period_end_on;
  let ct600Deadline = "-";
  let ct600PaymentDeadline = "-";
  if (periodEndStr) {
    const pEnd = new Date(periodEndStr);
    const ctFiling = new Date(pEnd);
    ctFiling.setFullYear(ctFiling.getFullYear() + 1);
    ct600Deadline = ctFiling.toLocaleDateString("en-GB");

    const ctPay = new Date(pEnd);
    ctPay.setMonth(ctPay.getMonth() + 9);
    ctPay.setDate(ctPay.getDate() + 1);
    ct600PaymentDeadline = ctPay.toLocaleDateString("en-GB");
  }

  const getRawJsonSection = () => {
    if (!data) return {};
    if (jsonTab === "all") return data;
    return data[jsonTab] || {};
  };

  return (
    <AppLayout>
      <div className="p-6 w-full mx-auto space-y-6">
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 rounded-2xl p-6 text-white shadow-lg border border-purple-800/40">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5 mb-1.5">
                <div className="p-2 rounded-xl bg-purple-500/20 border border-purple-400/30 text-purple-300">
                  <Building2 size={22} />
                </div>
                <h1 className="text-2xl font-bold tracking-tight">Companies House Live Data Inspector</h1>
              </div>
              <p className="text-purple-200/80 text-xs md:text-sm">
                Inspect complete, live Companies House data: Company Profile, Officers, PSC Shareholders, Filing History & Statutory Deadlines.
              </p>
            </div>

            {/* Quick CRN presets */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-purple-200/60 font-medium">Quick Test:</span>
              {[
                { name: "APEX LTD", crn: "03039224" },
                { name: "SANSOFT LTD", crn: "09599941" },
                { name: "ANIMAL EVENTS", crn: "08765432" },
              ].map(preset => (
                <button
                  key={preset.crn}
                  onClick={() => handleFetch(preset.crn)}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/20 text-white border border-white/10 transition-colors"
                >
                  {preset.name} ({preset.crn})
                </button>
              ))}
            </div>
          </div>

          {/* Search Input Bar */}
          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                value={crn}
                onChange={e => setCrn(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleFetch()}
                placeholder="Enter UK Company Registration Number (e.g. 03039224 or 09599941)"
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-purple-200/40 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 font-mono"
              />
            </div>
            <button
              onClick={() => handleFetch()}
              disabled={isLoading}
              className="px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 shrink-0"
            >
              {isLoading ? (
                <>
                  <RefreshCw size={16} className="animate-spin" /> Fetching Live API...
                </>
              ) : (
                <>
                  <Search size={16} /> Fetch All Live Data
                </>
              )}
            </button>
          </div>
        </div>

        {/* Company Summary Card */}
        {profile && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-3 flex-wrap">
                  <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                    {profile.company_name}
                  </h2>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${getStatusBadgeClass(profile.company_status)}`}>
                    {getCompanyStatusLabel(profile.company_status)}
                  </span>
                  {profile.can_file === false && (
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                      Filing Closed
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                  <span className="font-mono font-bold text-purple-700 dark:text-purple-400">
                    CRN: {profile.company_number}
                  </span>
                  <span>·</span>
                  <span>{getCompanyTypeLabel(profile.type)}</span>
                  <span>·</span>
                  <span>Jurisdiction: {getJurisdictionLabel(profile.jurisdiction)}</span>
                  <span>·</span>
                  <a
                    href={`https://find-and-update.company-information.service.gov.uk/company/${profile.company_number}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-purple-600 hover:text-purple-800 dark:text-purple-400 hover:underline inline-flex items-center gap-1 font-semibold"
                  >
                    View Official CH Profile <ExternalLink size={12} />
                  </a>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={downloadJson}
                  className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1.5 transition-colors"
                >
                  <Download size={14} /> Download JSON
                </button>
                <button
                  onClick={() => copyToClipboard(JSON.stringify(data, null, 2))}
                  className="px-3 py-2 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 text-xs font-semibold hover:bg-purple-100 flex items-center gap-1.5 transition-colors"
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />} Copy All JSON
                </button>
              </div>
            </div>

            {/* Quick Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800">
                <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Incorporation Date</p>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                  {profile.date_of_creation ? new Date(profile.date_of_creation).toLocaleDateString("en-GB") : "—"}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800">
                <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Active Officers</p>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                  {officers.filter((o: any) => !o.resigned_on).length} Active ({officers.length} Total)
                </p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800">
                <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">PSCs / Shareholders</p>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                  {pscList.length} Recorded
                </p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800">
                <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Mortgages & Charges</p>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                  {data.totalCharges || 0} Registered
                </p>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-slate-200 dark:border-slate-800 overflow-x-auto gap-2 pt-2">
              {[
                { id: "overview", label: "Overview & Address", icon: Building2 },
                { id: "statutory", label: "Statutory Deadlines", icon: Calendar },
                { id: "officers", label: `Officers (${officers.length})`, icon: Users },
                { id: "psc", label: `PSCs (${pscList.length})`, icon: Shield },
                { id: "filings", label: `Filing History (${filings.length})`, icon: FileText },
                { id: "charges", label: `Charges (${charges.length})`, icon: Landmark },
                { id: "raw", label: "Raw JSON Viewer", icon: FileCheck },
              ].map(tab => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as TabKey)}
                    className={`px-4 py-2.5 text-xs font-bold rounded-t-lg transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer border-b-2 ${activeTab === tab.id
                      ? "border-purple-600 text-purple-600 dark:text-purple-400 bg-purple-50/50 dark:bg-purple-950/20"
                      : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                      }`}
                  >
                    <Icon size={15} /> {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Tab 1: Overview & Registered Office */}
            {activeTab === "overview" && (
              <div className="space-y-6 pt-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Address Box */}
                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 space-y-3">
                    <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-bold text-sm">
                      <MapPin size={16} className="text-purple-600" /> Registered Office Address
                    </div>
                    {profile.registered_office_address ? (
                      <div className="text-xs space-y-1 text-slate-700 dark:text-slate-300">
                        {profile.registered_office_address.address_line_1 && <p>{profile.registered_office_address.address_line_1}</p>}
                        {profile.registered_office_address.address_line_2 && <p>{profile.registered_office_address.address_line_2}</p>}
                        {profile.registered_office_address.locality && <p>{profile.registered_office_address.locality}</p>}
                        {profile.registered_office_address.region && <p>{profile.registered_office_address.region}</p>}
                        {profile.registered_office_address.postal_code && (
                          <p className="font-mono font-bold text-purple-700 dark:text-purple-400">{profile.registered_office_address.postal_code}</p>
                        )}
                        {profile.registered_office_address.country && <p>{profile.registered_office_address.country}</p>}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400">No registered address returned.</p>
                    )}
                  </div>

                  {/* Company Profile Key Facts */}
                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 space-y-2.5 text-xs">
                    <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-bold text-sm mb-1">
                      <Briefcase size={16} className="text-purple-600" /> Corporate Information
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-800">
                      <span className="text-slate-500">Company Type</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{getCompanyTypeLabel(profile.type)}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-800">
                      <span className="text-slate-500">Jurisdiction</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{getJurisdictionLabel(profile.jurisdiction)}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-800">
                      <span className="text-slate-500">Has Charges Registered</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{profile.has_charges ? "Yes" : "No"}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-800">
                      <span className="text-slate-500">Has Insolvency History</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{profile.has_insolvency_history ? "Yes" : "No"}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-slate-500">Has Been Liquidated</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{profile.has_been_liquidated ? "Yes" : "No"}</span>
                    </div>
                  </div>
                </div>

                {/* SIC Codes Section */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Tag size={16} className="text-purple-600" />
                      <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                        Nature of Business (SIC Codes)
                      </h3>
                    </div>
                    {profile.sic_codes && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 font-bold border border-purple-200">
                        {profile.sic_codes.length} Registered
                      </span>
                    )}
                  </div>

                  {profile.sic_codes && profile.sic_codes.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                      {parseSicCodes(profile.sic_codes.join(", ")).map((sic, idx) => (
                        <div
                          key={idx}
                          className="flex items-start gap-2.5 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-left"
                        >
                          <span className="font-mono font-bold text-xs text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-950/60 px-2 py-1 rounded border border-purple-200 shrink-0">
                            {sic.code}
                          </span>
                          <span className="text-xs text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
                            {sic.description}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400">No SIC codes registered for this company.</p>
                  )}
                </div>
              </div>
            )}

            {/* Tab 2: Statutory Deadlines & Accounts */}
            {activeTab === "statutory" && (
              <div className="space-y-6 pt-2">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Card 1: Annual Accounts */}
                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                        <Calendar size={16} className="text-purple-600" /> Annual Accounts
                      </h3>
                      {profile.accounts?.next_accounts?.overdue ? (
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-rose-100 text-rose-700">Overdue</span>
                      ) : (
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-700">Active</span>
                      )}
                    </div>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between py-1 border-b border-slate-200/60">
                        <span className="text-slate-500">Next Accounts Due</span>
                        <span className="font-mono font-bold text-purple-700 dark:text-purple-400">
                          {profile.accounts?.next_accounts?.due_on
                            ? new Date(profile.accounts.next_accounts.due_on).toLocaleDateString("en-GB")
                            : "—"}
                        </span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-200/60">
                        <span className="text-slate-500">Period End On</span>
                        <span className="font-mono text-slate-700 dark:text-slate-300">
                          {profile.accounts?.next_accounts?.period_end_on
                            ? new Date(profile.accounts.next_accounts.period_end_on).toLocaleDateString("en-GB")
                            : "—"}
                        </span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-200/60">
                        <span className="text-slate-500">Last Accounts Filed</span>
                        <span className="font-mono text-slate-700 dark:text-slate-300">
                          {profile.accounts?.last_accounts?.made_up_to
                            ? new Date(profile.accounts.last_accounts.made_up_to).toLocaleDateString("en-GB")
                            : "—"}
                        </span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-slate-500">Accounts Type</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {getAccountTypeLabel(profile.accounts?.last_accounts?.type)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Card 2: Confirmation Statement (CS01) */}
                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                        <FileCheck size={16} className="text-indigo-600" /> Confirmation (CS01)
                      </h3>
                      {profile.confirmation_statement?.overdue ? (
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-rose-100 text-rose-700">Overdue</span>
                      ) : (
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-700">Due</span>
                      )}
                    </div>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between py-1 border-b border-slate-200/60">
                        <span className="text-slate-500">Next CS01 Due</span>
                        <span className="font-mono font-bold text-indigo-700 dark:text-indigo-400">
                          {profile.confirmation_statement?.next_due
                            ? new Date(profile.confirmation_statement.next_due).toLocaleDateString("en-GB")
                            : "—"}
                        </span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-200/60">
                        <span className="text-slate-500">Next Review Made Up To</span>
                        <span className="font-mono text-slate-700 dark:text-slate-300">
                          {profile.confirmation_statement?.next_made_up_to
                            ? new Date(profile.confirmation_statement.next_made_up_to).toLocaleDateString("en-GB")
                            : "—"}
                        </span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-slate-500">Last CS01 Made Up To</span>
                        <span className="font-mono text-slate-700 dark:text-slate-300">
                          {profile.confirmation_statement?.last_made_up_to
                            ? new Date(profile.confirmation_statement.last_made_up_to).toLocaleDateString("en-GB")
                            : "—"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Card 3: Corporation Tax CT600 (Calculated via HMRC statutory formula) */}
                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                        <Clock size={16} className="text-amber-600" /> Corporation Tax (CT600)
                      </h3>
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-100 text-amber-700">Statutory</span>
                    </div>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between py-1 border-b border-slate-200/60">
                        <span className="text-slate-500">CT600 Return Due (12m)</span>
                        <span className="font-mono font-bold text-amber-700 dark:text-amber-400">{ct600Deadline}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-200/60">
                        <span className="text-slate-500">Tax Payment Due (9m 1d)</span>
                        <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">{ct600PaymentDeadline}</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-slate-500">Accounting Ref Date</span>
                        <span className="font-mono text-slate-700 dark:text-slate-300">
                          {profile.accounts?.accounting_reference_date
                            ? `${profile.accounts.accounting_reference_date.day}/${profile.accounts.accounting_reference_date.month}`
                            : "—"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 3: Officers & Directors */}
            {activeTab === "officers" && (
              <div className="space-y-4 pt-2">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">
                    Appointed Officers & Directors ({officers.length})
                  </h3>
                </div>
                {officers.length === 0 ? (
                  <p className="text-xs text-slate-400 py-6 text-center">No officers found for this company.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    {officers.map((officer: any, idx: number) => (
                      <div
                        key={idx}
                        className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-2"
                      >
                        <div className="flex justify-between items-start gap-2">
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white text-sm">{officer.name}</p>
                            <span className="inline-block mt-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200">
                              {getOfficerRoleLabel(officer.officer_role)}
                            </span>
                          </div>
                          {officer.resigned_on ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700">
                              Resigned ({new Date(officer.resigned_on).toLocaleDateString("en-GB")})
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700">
                              Active
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-slate-500 pt-1">
                          <div>
                            <span className="font-medium text-slate-400 block">Appointed:</span>
                            <span className="text-slate-700 dark:text-slate-300 font-mono">
                              {officer.appointed_on ? new Date(officer.appointed_on).toLocaleDateString("en-GB") : "—"}
                            </span>
                          </div>
                          <div>
                            <span className="font-medium text-slate-400 block">Nationality / Occupation:</span>
                            <span className="text-slate-700 dark:text-slate-300">
                              {officer.nationality || "—"} / {officer.occupation || "—"}
                            </span>
                          </div>
                        </div>
                        {officer.address && (
                          <div className="text-[11px] text-slate-400 pt-1 truncate">
                            Address: {[officer.address.address_line_1, officer.address.locality, officer.address.postal_code].filter(Boolean).join(", ")}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tab 4: Persons with Significant Control (PSC) */}
            {activeTab === "psc" && (
              <div className="space-y-4 pt-2">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">
                    Persons with Significant Control ({pscList.length})
                  </h3>
                </div>
                {pscList.length === 0 ? (
                  <p className="text-xs text-slate-400 py-6 text-center">No PSC records found for this company.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    {pscList.map((psc: any, idx: number) => (
                      <div
                        key={idx}
                        className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-2.5"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white text-sm">{psc.name}</p>
                            <span className="text-[10px] text-slate-400 capitalize">{psc.kind?.replace(/-/g, " ")}</span>
                          </div>
                          {psc.notified_on && (
                            <span className="text-[10px] font-mono text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                              Notified: {new Date(psc.notified_on).toLocaleDateString("en-GB")}
                            </span>
                          )}
                        </div>

                        {psc.natures_of_control && psc.natures_of_control.length > 0 && (
                          <div className="space-y-1">
                            <p className="text-[11px] font-bold text-slate-600 dark:text-slate-300">Nature of Control:</p>
                            <div className="flex flex-wrap gap-1.5">
                              {psc.natures_of_control.map((ctrl: string, cIdx: number) => (
                                <span
                                  key={cIdx}
                                  className="text-[10px] px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800"
                                >
                                  {ctrl.replace(/-/g, " ")}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tab 5: Filing History */}
            {activeTab === "filings" && (
              <div className="space-y-4 pt-2">
                <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">
                  Recent Filing History ({filings.length} Filings)
                </h3>
                {filings.length === 0 ? (
                  <p className="text-xs text-slate-400 py-6 text-center">No filings found.</p>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800">
                        <tr>
                          <th className="px-4 py-3">Date</th>
                          <th className="px-4 py-3">Type</th>
                          <th className="px-4 py-3">Description</th>
                          <th className="px-4 py-3">Category</th>
                          <th className="px-4 py-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {filings.map((f: any, idx: number) => (
                          <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                            <td className="px-4 py-2.5 font-mono text-slate-600 dark:text-slate-300 whitespace-nowrap">
                              {f.date ? new Date(f.date).toLocaleDateString("en-GB") : "—"}
                            </td>
                            <td className="px-4 py-2.5 font-bold font-mono text-purple-700 dark:text-purple-400 whitespace-nowrap">
                              {f.type}
                            </td>
                            <td className="px-4 py-2.5 text-slate-700 dark:text-slate-300 max-w-md">
                              {f.description?.replace(/-/g, " ") || f.type}
                            </td>
                            <td className="px-4 py-2.5 text-slate-500 capitalize whitespace-nowrap">
                              {f.category || "General"}
                            </td>
                            <td className="px-4 py-2.5 text-right whitespace-nowrap">
                              {f.links?.document_metadata ? (
                                <a
                                  href={`/api/companies-house/document-download?docUrl=${encodeURIComponent(f.links.document_metadata)}&crn=${encodeURIComponent(crn)}${token ? `&token=${encodeURIComponent(token)}` : ""}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-200 bg-purple-50 dark:bg-purple-950/40 px-2.5 py-1 rounded border border-purple-200 dark:border-purple-800 transition-colors"
                                  title="Download official filing PDF"
                                >
                                  <Download size={12} />
                                  PDF
                                </a>
                              ) : (
                                <span className="text-[10px] text-slate-400">—</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Tab 6: Charges */}
            {activeTab === "charges" && (
              <div className="space-y-4 pt-2">
                <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">
                  Registered Charges & Mortgages ({charges.length})
                </h3>
                {charges.length === 0 ? (
                  <p className="text-xs text-slate-400 py-6 text-center">No charges registered for this company.</p>
                ) : (
                  <div className="space-y-3">
                    {charges.map((chg: any, idx: number) => (
                      <div
                        key={idx}
                        className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 text-xs space-y-2"
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-slate-900">{chg.classification?.description || "Charge"}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${chg.status === "satisfied" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                            {chg.status}
                          </span>
                        </div>
                        <p className="text-slate-600">Created on: {chg.created_on || "—"}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tab 7: Raw JSON Viewer */}
            {activeTab === "raw" && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg text-xs">
                    {(["all", "profile", "officers", "psc", "filingHistory", "charges"] as const).map(sec => (
                      <button
                        key={sec}
                        onClick={() => setJsonTab(sec)}
                        className={`px-3 py-1 rounded-md font-semibold capitalize transition-all ${jsonTab === sec
                          ? "bg-white dark:bg-slate-700 text-purple-700 dark:text-purple-300 shadow-xs"
                          : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                          }`}
                      >
                        {sec}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => copyToClipboard(JSON.stringify(getRawJsonSection(), null, 2))}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 text-white hover:bg-slate-700 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    {copied ? <Check size={14} /> : <Copy size={14} />} Copy Current JSON
                  </button>
                </div>

                <div className="bg-slate-950 rounded-xl p-4 border border-slate-800 shadow-inner overflow-hidden">
                  <pre className="text-emerald-400 font-mono text-xs overflow-x-auto max-h-[500px] whitespace-pre-wrap leading-relaxed">
                    {JSON.stringify(getRawJsonSection(), null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Empty State before search */}
        {!profile && !isLoading && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center shadow-xs space-y-3">
            <div className="w-12 h-12 rounded-full bg-purple-50 dark:bg-purple-950/60 text-purple-600 mx-auto flex items-center justify-center">
              <Building2 size={24} />
            </div>
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
              Ready to Inspect Companies House Data
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              Enter any UK Company Registration Number (CRN) above, or click one of the quick test buttons to view complete real-time information from Companies House.
            </p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
