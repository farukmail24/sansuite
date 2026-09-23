import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import ClientWorkspaceLayout, { useClientWorkspace } from "./ClientWorkspaceLayout";
import { apiRequest } from "../../../lib/queryClient";
import { useToast } from "../../../hooks/useToast";
import { useAuth } from "../../../hooks/useAuth";
import {
  Building2, Save, RefreshCw, Key, ShieldCheck,
  ExternalLink, Users, Shield, FileText, Download,
  CheckCircle2, AlertCircle, Plus, Search
} from "lucide-react";

type ChTab = "officers" | "psc" | "filing-history" | "credentials";

export default function ChApiWorkspacePage() {
  return (
    <ClientWorkspaceLayout activeSection="CH API'S Integration">
      <ChApiWorkspaceContent />
    </ClientWorkspaceLayout>
  );
}

function ChApiWorkspaceContent() {
  const { clientId, client, refetchClient } = useClientWorkspace();
  const { toast } = useToast();
  const { token } = useAuth();

  const [activeTab, setActiveTab] = useState<ChTab>("officers");

  // Registration Number Edit / Linking
  const [crnInput, setCrnInput] = useState(client?.registrationNumber || "");
  const [isEditingCrn, setIsEditingCrn] = useState(!client?.registrationNumber);

  // Credentials State
  const [chAuthCode, setChAuthCode] = useState("");
  const [chPresenterId, setChPresenterId] = useState("");
  const [chPresenterAuthCode, setChPresenterAuthCode] = useState("");

  const crn = (client?.registrationNumber || "").trim().toUpperCase();

  // 1. Fetch Live Companies House Data
  const {
    data: chData,
    isLoading: isLoadingCh,
    refetch: refetchCh,
    isFetching: isFetchingCh,
  } = useQuery<any>({
    queryKey: [`/api/companies-house/company/${crn}/all`],
    queryFn: async () => {
      if (!crn) return null;
      const res = await apiRequest("GET", `/api/companies-house/company/${encodeURIComponent(crn)}/all`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to load Companies House data.");
      }
      return res.json();
    },
    enabled: !!crn,
    retry: 1,
  });

  // 2. Fetch Stored WebFiling Credentials
  const { data: chSettings, refetch: refetchSettings } = useQuery<any>({
    queryKey: [`/api/accounts-production/${clientId}/ch-settings`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/accounts-production/${clientId}/ch-settings`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!clientId,
  });

  useEffect(() => {
    if (chSettings) {
      if (chSettings.chAuthCode) setChAuthCode(chSettings.chAuthCode);
      if (chSettings.presenterId) setChPresenterId(chSettings.presenterId);
      if (chSettings.presenterAuthCode) setChPresenterAuthCode(chSettings.presenterAuthCode);
    } else if (client?.ch_auth_code) {
      setChAuthCode(client.ch_auth_code);
    }
  }, [chSettings, client]);

  useEffect(() => {
    if (client?.registrationNumber) {
      setCrnInput(client.registrationNumber);
      setIsEditingCrn(false);
    }
  }, [client?.registrationNumber]);

  // Update CRN on Client
  const saveCrnMutation = useMutation({
    mutationFn: async (newCrn: string) => {
      return await apiRequest("PUT", `/api/practice/clients/${clientId}`, {
        registrationNumber: newCrn.trim().toUpperCase(),
      });
    },
    onSuccess: () => {
      refetchClient();
      setIsEditingCrn(false);
      toast({ title: "Company Number Saved", description: "Companies House records will now synchronize." });
    },
    onError: (err: any) => {
      toast({ title: "Save Failed", description: err.message || "Failed to update company number.", variant: "destructive" });
    }
  });

  // Save Gateway Credentials
  const saveChSettingsMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", `/api/accounts-production/${clientId}/ch-settings`, {
        chAuthCode,
        presenterId: chPresenterId,
        presenterAuthCode: chPresenterAuthCode,
      });
    },
    onSuccess: () => {
      toast({ title: "API Settings Saved", description: "Companies House electronic gateway credentials updated." });
      refetchSettings();
    },
    onError: (err: any) => {
      toast({ title: "Save Failed", description: err.message || "Failed to save API credentials.", variant: "destructive" });
    }
  });

  // Sync Live Officers to SanSuite's Officers/Signatories Table
  const syncOfficersMutation = useMutation({
    mutationFn: async (officersList: any[]) => {
      const activeOfficers = officersList.filter((o: any) => !o.resigned_on);
      for (const off of activeOfficers) {
        await apiRequest("POST", `/api/accounts-production/${clientId}/ch-directors`, {
          name: off.name,
          role: off.officer_role === "secretary" ? "Secretary" : "Director",
          appointedOn: off.appointed_on || new Date().toISOString().split("T")[0],
          isSignatory: off.officer_role !== "secretary",
        });
      }
      return activeOfficers.length;
    },
    onSuccess: (count) => {
      toast({
        title: "Officers Synchronized",
        description: `Successfully imported ${count} active director(s) to SanSuite annual accounts signatories.`,
      });
    },
    onError: (err: any) => {
      toast({ title: "Sync Failed", description: err.message || "Could not sync officers.", variant: "destructive" });
    }
  });

  const officers = chData?.officers || [];
  const pscList = chData?.psc || [];
  const filingHistory = chData?.filingHistory || [];
  const profile = chData?.profile;

  const formatAddress = (addr: any) => {
    if (!addr) return "N/A";
    if (typeof addr === "string") return addr;
    const parts = [
      addr.premises,
      addr.address_line_1,
      addr.address_line_2,
      addr.locality,
      addr.region,
      addr.postal_code,
    ].filter(Boolean);
    return parts.join(", ") || "N/A";
  };

  const formatFilingDescription = (desc: string) => {
    if (!desc) return "Filing Document";
    return desc
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-bold text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Building2 size={18} className="text-indigo-600" />
                CH API Integration
              </h2>
              {crn && (
                <span className="bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-mono text-xs px-2.5 py-0.5 rounded-full font-semibold border border-indigo-200 dark:border-indigo-800">
                  CRN: {crn}
                </span>
              )}
              {profile?.company_status && (
                <span className="bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-xs px-2.5 py-0.5 rounded-full font-semibold capitalize">
                  {profile.company_status}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Live UK Companies House statutory registers, company officers, beneficial owners (PSC) and filing archive for {client?.clientName}.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {crn && (
              <>
                <button
                  type="button"
                  onClick={() => refetchCh()}
                  disabled={isFetchingCh}
                  className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Refresh live data from Companies House"
                >
                  <RefreshCw size={13} className={isFetchingCh ? "animate-spin text-indigo-600" : ""} />
                  {isFetchingCh ? "Syncing..." : "Refresh CH Data"}
                </button>

                <a
                  href={`https://find-and-update.company-information.service.gov.uk/company/${encodeURIComponent(crn)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
                  title="Open official registry record on Companies House"
                >
                  <ExternalLink size={13} /> Companies House
                </a>
              </>
            )}
          </div>
        </div>

        {/* Company Registration Number Quick Configuration if Missing or Editing */}
        {(!crn || isEditingCrn) && (
          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 max-w-xl">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                Company Number (CRN):
              </label>
              <div className="flex items-center gap-2 flex-1">
                <input
                  type="text"
                  placeholder="e.g. 14389025"
                  value={crnInput}
                  onChange={(e) => setCrnInput(e.target.value.toUpperCase())}
                  className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                />
                <button
                  type="button"
                  onClick={() => saveCrnMutation.mutate(crnInput)}
                  disabled={!crnInput.trim() || saveCrnMutation.isPending}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold disabled:opacity-50 cursor-pointer shadow-xs transition-colors"
                >
                  {saveCrnMutation.isPending ? "Linking..." : "Link Company"}
                </button>
                {crn && (
                  <button
                    type="button"
                    onClick={() => setIsEditingCrn(false)}
                    className="px-2.5 py-1.5 text-xs text-slate-500 hover:text-slate-700 cursor-pointer"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Enter the 8-digit UK Companies House registration number to load live statutory officers, PSC, and filing documents.
            </p>
          </div>
        )}
      </div>

      {/* Tabs Bar matching Capium */}
      <div className="border-b border-slate-200 dark:border-slate-800 flex flex-wrap gap-1">
        <button
          type="button"
          onClick={() => setActiveTab("officers")}
          className={`px-4 py-2 font-semibold text-xs rounded-t-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === "officers"
              ? "bg-white dark:bg-slate-900 border-t-2 border-indigo-600 text-indigo-600 dark:text-indigo-400 shadow-xs"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/50"
          }`}
        >
          <Users size={14} /> Company Officers ({officers.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("psc")}
          className={`px-4 py-2 font-semibold text-xs rounded-t-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === "psc"
              ? "bg-white dark:bg-slate-900 border-t-2 border-indigo-600 text-indigo-600 dark:text-indigo-400 shadow-xs"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/50"
          }`}
        >
          <Shield size={14} /> Person with significant control ({pscList.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("filing-history")}
          className={`px-4 py-2 font-semibold text-xs rounded-t-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === "filing-history"
              ? "bg-white dark:bg-slate-900 border-t-2 border-indigo-600 text-indigo-600 dark:text-indigo-400 shadow-xs"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/50"
          }`}
        >
          <FileText size={14} /> Filing History ({filingHistory.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("credentials")}
          className={`px-4 py-2 font-semibold text-xs rounded-t-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === "credentials"
              ? "bg-white dark:bg-slate-900 border-t-2 border-indigo-600 text-indigo-600 dark:text-indigo-400 shadow-xs"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/50"
          }`}
        >
          <Key size={14} /> Filing Credentials & WebFiling
        </button>
      </div>

      {/* Loading Indicator */}
      {isLoadingCh && crn && (
        <div className="p-12 text-center text-xs text-slate-500 flex flex-col items-center justify-center min-h-[30vh] gap-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
          <RefreshCw size={24} className="animate-spin text-indigo-600" />
          <span>Synchronizing live company data from Companies House...</span>
        </div>
      )}

      {/* Missing CRN Zero State */}
      {!crn && (
        <div className="bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-10 text-center space-y-3 max-w-xl mx-auto">
          <div className="w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 mx-auto flex items-center justify-center">
            <Building2 size={24} />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">No Company Registration Number</h3>
            <p className="text-xs text-slate-500 mt-1">
              Please enter the 8-digit UK Companies House CRN above to pull live statutory officers, PSC records, and filing history.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsEditingCrn(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold cursor-pointer shadow-xs"
          >
            Enter Company Number
          </button>
        </div>
      )}

      {/* TAB 1: Company Officers (Exact Capium Screenshot 1) */}
      {activeTab === "officers" && crn && !isLoadingCh && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs space-y-4 p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h3 className="font-bold text-xs text-slate-900 dark:text-slate-100">Company Officers</h3>
              <p className="text-[11px] text-slate-500">Live directors and company secretaries registered at Companies House.</p>
            </div>
            {officers.length > 0 && (
              <button
                type="button"
                onClick={() => syncOfficersMutation.mutate(officers)}
                disabled={syncOfficersMutation.isPending}
                className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors disabled:opacity-50"
                title="Import these directors into SanSuite accounts production signatories"
              >
                <CheckCircle2 size={13} />
                {syncOfficersMutation.isPending ? "Syncing..." : "Sync Officers to Signatories"}
              </button>
            )}
          </div>

          <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg">
            <table className="w-full text-[11px] text-left">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
                  <th className="py-2.5 px-3">Name</th>
                  <th className="py-2.5 px-3">Address</th>
                  <th className="py-2.5 px-3">Role</th>
                  <th className="py-2.5 px-3">Nationality</th>
                  <th className="py-2.5 px-3">Country of Residence</th>
                  <th className="py-2.5 px-3">Appointed on</th>
                  <th className="py-2.5 px-3">Resigned on</th>
                  <th className="py-2.5 px-3">Occupation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {officers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400 text-xs">
                      No officers recorded at Companies House.
                    </td>
                  </tr>
                ) : (
                  officers.map((off: any, idx: number) => (
                    <tr key={idx} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                        {off.name}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300 max-w-xs">
                        {formatAddress(off.address)}
                      </td>
                      <td className="py-2.5 px-3 capitalize text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        {off.officer_role || "director"}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        {off.nationality || "—"}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        {off.country_of_residence || "—"}
                      </td>
                      <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300 whitespace-nowrap font-mono">
                        {off.appointed_on || "—"}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap font-mono">
                        {off.resigned_on || "N/A"}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        {off.occupation || "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: Person with significant control (Exact Capium Screenshot 2) */}
      {activeTab === "psc" && crn && !isLoadingCh && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs space-y-4 p-5">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="font-bold text-xs text-slate-900 dark:text-slate-100">Person with significant control</h3>
            <p className="text-[11px] text-slate-500">Beneficial owners and entities holding 25%+ voting rights or capital control.</p>
          </div>

          <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg">
            <table className="w-full text-[11px] text-left">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
                  <th className="py-2.5 px-3">Name</th>
                  <th className="py-2.5 px-3">Address</th>
                  <th className="py-2.5 px-3">Notified on</th>
                  <th className="py-2.5 px-3">Ceased on</th>
                  <th className="py-2.5 px-3">Country of Residence</th>
                  <th className="py-2.5 px-3">Nationality</th>
                  <th className="py-2.5 px-3">Nature of control</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {pscList.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                      No Person with Significant Control recorded at Companies House.
                    </td>
                  </tr>
                ) : (
                  pscList.map((psc: any, idx: number) => (
                    <tr key={idx} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                        {psc.name}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300 max-w-xs">
                        {formatAddress(psc.address)}
                      </td>
                      <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300 whitespace-nowrap font-mono">
                        {psc.notified_on || "—"}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap font-mono">
                        {psc.ceased_on || ""}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        {psc.country_of_residence || "—"}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        {psc.nationality || "—"}
                      </td>
                      <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300">
                        {Array.isArray(psc.natures_of_control) && psc.natures_of_control.length > 0 ? (
                          <ul className="list-disc list-inside space-y-0.5 text-[10px]">
                            {psc.natures_of_control.map((noc: string, i: number) => (
                              <li key={i} className="text-slate-600 dark:text-slate-400">
                                {noc.replace(/-/g, " ")}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          "—"
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

      {/* TAB 3: Filing History (Exact Capium Screenshot 3) */}
      {activeTab === "filing-history" && crn && !isLoadingCh && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs space-y-4 p-5">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="font-bold text-xs text-slate-900 dark:text-slate-100">Filing History</h3>
            <p className="text-[11px] text-slate-500">Historical statutory filings, accounts, and confirmation statements.</p>
          </div>

          <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg">
            <table className="w-full text-[11px] text-left">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
                  <th className="py-2.5 px-4 w-32">Date</th>
                  <th className="py-2.5 px-4">Description</th>
                  <th className="py-2.5 px-4 text-center w-28">Download</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filingHistory.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-8 text-center text-slate-400 text-xs">
                      No filing history found for this company.
                    </td>
                  </tr>
                ) : (
                  filingHistory.map((item: any, idx: number) => {
                    const docMeta = item.links?.document_metadata;
                    const downloadUrl = docMeta
                      ? `/api/companies-house/document-download?docUrl=${encodeURIComponent(docMeta)}&crn=${encodeURIComponent(crn)}${token ? `&token=${encodeURIComponent(token)}` : ""}`
                      : `https://find-and-update.company-information.service.gov.uk/company/${encodeURIComponent(crn)}/filing-history`;

                    return (
                      <tr key={idx} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-2.5 px-4 font-mono text-slate-700 dark:text-slate-300 whitespace-nowrap">
                          {item.date}
                        </td>
                        <td className="py-2.5 px-4 text-slate-800 dark:text-slate-200">
                          <span className="font-medium">{item.description}</span>
                          {item.category && (
                            <span className="ml-2 text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 uppercase">
                              {item.category}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          <a
                            href={downloadUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center w-7 h-7 rounded bg-sky-500 hover:bg-sky-600 text-white shadow-xs transition-colors"
                            title={docMeta ? "Download official filing PDF" : "View filing on Companies House"}
                          >
                            <Download size={13} />
                          </a>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: API Credentials & WebFiling Codes */}
      {activeTab === "credentials" && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs space-y-5 max-w-xl">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Key size={16} className="text-indigo-600" />
              Companies House API & Electronic Gateway Credentials
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              WebFiling Authentication Code and Electronic Presenter credentials for {client?.clientName}.
            </p>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                <Key size={13} className="text-indigo-600" />
                Company Authentication Code (WebFiling Code)
              </label>
              <input
                type="text"
                placeholder="e.g. A1B2C3"
                value={chAuthCode}
                onChange={(e) => setChAuthCode(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
              />
              <p className="text-[10px] text-slate-400 mt-1">6-character alphanumeric code provided by Companies House.</p>
            </div>

            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                <ShieldCheck size={13} className="text-indigo-600" />
                Electronic Presenter Account ID (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. 00012345678"
                value={chPresenterId}
                onChange={(e) => setChPresenterId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
              />
              <p className="text-[10px] text-slate-400 mt-1">11-digit Presenter ID if using dedicated client presenter credentials.</p>
            </div>

            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                <Key size={13} className="text-indigo-600" />
                Presenter Authentication Code
              </label>
              <input
                type="password"
                placeholder="Presenter Secret Code"
                value={chPresenterAuthCode}
                onChange={(e) => setChPresenterAuthCode(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
              />
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => saveChSettingsMutation.mutate()}
                disabled={saveChSettingsMutation.isPending}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium shadow-xs cursor-pointer flex items-center gap-1.5 transition-colors"
              >
                <Save size={13} /> {saveChSettingsMutation.isPending ? "Saving..." : "Save API Settings"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
