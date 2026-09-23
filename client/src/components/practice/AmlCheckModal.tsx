import { useState } from "react";
import { ShieldCheck, ShieldAlert, X, FileSearch, KeyRound, CheckCircle2, UserCheck, ExternalLink, Copy, Check, Building2, Globe } from "lucide-react";
import { apiRequest } from "../../lib/queryClient";
import { useToast } from "../../hooks/useToast";

export default function AmlCheckModal({ client, onClose }: { client: any, onClose: () => void }) {
  const { toast } = useToast();
  const [provider, setProvider] = useState<"opensanctions" | "dilisense" | "xama" | "veriphy">("opensanctions");
  const [status, setStatus] = useState<"idle" | "running" | "passed" | "flagged" | "no_key" | "xama_ready">("idle");
  const [resultData, setResultData] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [copied, setCopied] = useState(false);

  const runAmlCheck = async () => {
    setStatus("running");
    setErrorMessage("");
    setResultData(null);
    try {
      if (provider === "opensanctions") {
        const res = await apiRequest("POST", "/api/aml/opensanctions/check", {
          clientId: client?.id,
          names: client?.clientName || "Client",
          clientName: client?.clientName || "Client",
        });
        const data = await res.json();

        if (!res.ok || !data.success) {
          setStatus("flagged");
          setErrorMessage(data.message || "OpenSanctions screening flagged potential matches.");
          setResultData(data);
          return;
        }

        setResultData(data);
        if (data.clean) {
          setStatus("passed");
        } else {
          setStatus("flagged");
        }
      } else if (provider === "dilisense") {
        const isCompany = client?.clientType?.toLowerCase().includes("limited") || client?.clientType?.toLowerCase().includes("corporate");
        const res = await apiRequest("POST", "/api/aml/dilisense/check", {
          clientId: client?.id,
          names: client?.clientName || "Client",
          searchType: isCompany ? "entity" : "individual",
          citizenship: client?.country === "United Kingdom" ? "GB" : client?.country || "GB",
        });
        const data = await res.json();

        if (!res.ok || !data.success) {
          if (data.message?.includes("API Key is missing") || res.status === 401) {
            setStatus("no_key");
            setErrorMessage(data.message || "Dilisense API Key is missing. Please configure in Practice AML Settings.");
            return;
          }
          setStatus("flagged");
          setErrorMessage(data.message || "Screening flagged potential matches.");
          setResultData(data);
          return;
        }

        setResultData(data);
        if (data.clean) {
          setStatus("passed");
        } else {
          setStatus("flagged");
        }
      } else if (provider === "xama") {
        const res = await apiRequest("POST", "/api/aml/xama/initiate", {
          clientId: client?.id,
          clientName: client?.clientName || "Client",
          email: client?.email,
          phone: client?.phone,
          companyNumber: client?.registrationNumber,
        });
        const data = await res.json();

        if (!res.ok || !data.success) {
          if (data.message?.includes("API Key is missing") || res.status === 401) {
            setStatus("no_key");
            setErrorMessage(data.message || "Xama API Key is missing. Please configure in Practice AML Settings.");
            return;
          }
          setStatus("flagged");
          setErrorMessage(data.message || "Failed to initiate Xama onboarding.");
          return;
        }

        setResultData(data);
        setStatus("xama_ready");
      } else {
        const res = await apiRequest("POST", "/api/aml/veriphy/check", {
          clientId: client?.id,
          clientName: client?.clientName || "Client",
          names: client?.clientName || "Client",
        });
        const data = await res.json();

        if (!res.ok || !data.success) {
          if (data.message?.includes("API Key is missing") || res.status === 401) {
            setStatus("no_key");
            setErrorMessage(data.message || "Veriphy API Key is missing. Please configure in Practice AML Settings.");
            return;
          }
          setStatus("flagged");
          setErrorMessage(data.message || "Veriphy screening failed.");
          return;
        }

        setResultData(data);
        setStatus("passed");
      }
    } catch (err: any) {
      setStatus("flagged");
      setErrorMessage(err.message || "Failed to connect to AML screening provider API.");
    }
  };

  const handleCopyLink = () => {
    if (resultData?.verificationUrl) {
      navigator.clipboard.writeText(resultData.verificationUrl);
      setCopied(true);
      toast({ title: "Link Copied", description: "Verification portal URL copied to clipboard." });
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in text-xs">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60">
          <h2 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 text-sm">
            <ShieldCheck size={18} className="text-purple-600" />
            AML & Identity Compliance Screening
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 cursor-pointer">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Provider Selector Tabs (4 Multi-Tenant Options) */}
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Select Verification Provider:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setProvider("opensanctions");
                  setStatus("idle");
                  setResultData(null);
                }}
                className={`p-2 rounded-lg border text-left cursor-pointer transition-all flex flex-col gap-0.5 ${
                  provider === "opensanctions"
                    ? "border-purple-600 bg-purple-50/70 dark:bg-purple-950/40 text-purple-900 dark:text-purple-200 shadow-xs"
                    : "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"
                }`}
              >
                <div className="font-bold flex items-center justify-between text-[11px]">
                  <span>OpenSanctions</span>
                  {provider === "opensanctions" && <CheckCircle2 size={11} className="text-purple-600" />}
                </div>
                <span className="text-[9px] text-emerald-600 font-medium">Free & Open</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setProvider("dilisense");
                  setStatus("idle");
                  setResultData(null);
                }}
                className={`p-2 rounded-lg border text-left cursor-pointer transition-all flex flex-col gap-0.5 ${
                  provider === "dilisense"
                    ? "border-purple-600 bg-purple-50/70 dark:bg-purple-950/40 text-purple-900 dark:text-purple-200 shadow-xs"
                    : "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"
                }`}
              >
                <div className="font-bold flex items-center justify-between text-[11px]">
                  <span>Dilisense</span>
                  {provider === "dilisense" && <CheckCircle2 size={11} className="text-purple-600" />}
                </div>
                <span className="text-[9px] text-slate-500 line-clamp-1">100 Free/Mo</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setProvider("xama");
                  setStatus("idle");
                  setResultData(null);
                }}
                className={`p-2 rounded-lg border text-left cursor-pointer transition-all flex flex-col gap-0.5 ${
                  provider === "xama"
                    ? "border-purple-600 bg-purple-50/70 dark:bg-purple-950/40 text-purple-900 dark:text-purple-200 shadow-xs"
                    : "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"
                }`}
              >
                <div className="font-bold flex items-center justify-between text-[11px]">
                  <span>Xama Tech</span>
                  {provider === "xama" && <CheckCircle2 size={11} className="text-purple-600" />}
                </div>
                <span className="text-[9px] text-slate-500 line-clamp-1">Biometric eIDV</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setProvider("veriphy");
                  setStatus("idle");
                  setResultData(null);
                }}
                className={`p-2 rounded-lg border text-left cursor-pointer transition-all flex flex-col gap-0.5 ${
                  provider === "veriphy"
                    ? "border-purple-600 bg-purple-50/70 dark:bg-purple-950/40 text-purple-900 dark:text-purple-200 shadow-xs"
                    : "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"
                }`}
              >
                <div className="font-bold flex items-center justify-between text-[11px]">
                  <span>Veriphy</span>
                  {provider === "veriphy" && <CheckCircle2 size={11} className="text-purple-600" />}
                </div>
                <span className="text-[9px] text-slate-500 line-clamp-1">SmartSearch</span>
              </button>
            </div>
          </div>

          {/* Subject info card */}
          <div className="bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-lg border border-slate-200 dark:border-slate-700 space-y-1.5">
            <div className="flex justify-between">
              <span className="text-slate-500">Subject:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{client?.clientName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Client Type:</span>
              <span className="font-medium text-slate-700 dark:text-slate-300">{client?.clientType || "Individual"}</span>
            </div>
            {client?.registrationNumber && (
              <div className="flex justify-between">
                <span className="text-slate-500">Company Reg No:</span>
                <span className="font-mono text-slate-700 dark:text-slate-300">{client?.registrationNumber}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-slate-500">Jurisdiction:</span>
              <span className="font-medium text-slate-700 dark:text-slate-300">{client?.country || "United Kingdom (GB)"}</span>
            </div>
          </div>

          {/* Action Trigger Button */}
          {status === "idle" && (
            <button
              onClick={runAmlCheck}
              className="bg-[#5c469c] hover:bg-[#4b3882] text-white w-full py-2.5 rounded-lg font-bold flex justify-center items-center gap-2 cursor-pointer shadow-xs transition-colors"
            >
              {provider === "opensanctions" ? (
                <>
                  <Globe size={15} /> Run OpenSanctions Free PEP & Sanctions Check
                </>
              ) : provider === "dilisense" ? (
                <>
                  <FileSearch size={15} /> Run Dilisense PEP & Sanctions Screening
                </>
              ) : provider === "xama" ? (
                <>
                  <UserCheck size={15} /> Initiate Xama Biometric Onboarding Journey
                </>
              ) : (
                <>
                  <Building2 size={15} /> Run Veriphy (Davies Group) Electronic IDV
                </>
              )}
            </button>
          )}

          {status === "running" && (
            <div className="flex flex-col items-center py-6">
              <div className="w-8 h-8 border-3 border-purple-200 border-t-purple-600 rounded-full animate-spin mb-3"></div>
              <p className="text-xs text-slate-600 dark:text-slate-400 animate-pulse font-medium">
                {provider === "opensanctions"
                  ? "Querying OpenSanctions open database & international watchlists..."
                  : provider === "dilisense"
                  ? "Querying Dilisense global sanctions & PEP databases..."
                  : provider === "xama"
                  ? "Connecting to Xama Tech API & preparing biometric session..."
                  : "Connecting to Veriphy Gateway & verifying UK records..."}
              </p>
            </div>
          )}

          {status === "no_key" && (
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-4 rounded-lg">
              <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-bold mb-1">
                <KeyRound size={16} className="text-amber-600" />
                <span>Practice Gateway Key Configuration Needed</span>
              </div>
              <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-1">{errorMessage}</p>
            </div>
          )}

          {status === "passed" && (
            <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 p-4 rounded-lg text-center space-y-2">
              <CheckCircle2 size={28} className="text-emerald-600 mx-auto" />
              <h3 className="font-bold text-emerald-800 dark:text-emerald-200 text-sm">
                {provider === "veriphy" ? "Veriphy IDV Verification Passed" : provider === "opensanctions" ? "OpenSanctions Screening Passed" : "Dilisense Screening Passed"}
              </h3>
              <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
                0 matches found across OFSI, OFAC, EU, UN Sanctions, PEP, and international criminal watchlists. Clean pass recorded.
              </p>
            </div>
          )}

          {status === "flagged" && (
            <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 p-4 rounded-lg space-y-2">
              <div className="flex items-center gap-2 text-red-800 dark:text-red-300 font-bold">
                <ShieldAlert size={18} className="text-red-600" />
                <span>Screening Alert / Flagged</span>
              </div>
              <p className="text-[11px] text-red-700 dark:text-red-400">{errorMessage}</p>
              {resultData?.records && resultData.records.length > 0 && (
                <div className="mt-2 bg-white dark:bg-slate-900 border border-red-200 dark:border-red-900 rounded p-2 text-[10px] space-y-1">
                  <div className="font-semibold text-red-900 dark:text-red-200">Potential Matches: {resultData.records.length}</div>
                  {resultData.records.slice(0, 3).map((rec: any, idx: number) => (
                    <div key={idx} className="text-slate-600 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-1">
                      <strong>{rec.caption || rec.name}</strong> - Schema: {rec.schema || "Entity"}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {status === "xama_ready" && (
            <div className="bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 p-4 rounded-lg space-y-3">
              <div className="flex items-center gap-2 text-purple-900 dark:text-purple-200 font-bold">
                <CheckCircle2 size={16} className="text-purple-600" />
                <span>Xama Biometric Onboarding Link Ready</span>
              </div>
              <p className="text-[11px] text-purple-800 dark:text-purple-300">
                A secure client portal link has been generated. Send this link to the client so they can complete biometric facial recognition and passport verification:
              </p>
              <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-800 rounded px-2.5 py-1.5 font-mono text-[11px] text-purple-950 dark:text-purple-200 break-all">
                <span className="truncate flex-1">{resultData?.verificationUrl}</span>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="p-1 hover:bg-purple-100 dark:hover:bg-purple-900/50 rounded cursor-pointer text-purple-600"
                  title="Copy Link"
                >
                  {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                </button>
                <a
                  href={resultData?.verificationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1 hover:bg-purple-100 dark:hover:bg-purple-900/50 rounded cursor-pointer text-purple-600"
                  title="Open Portal"
                >
                  <ExternalLink size={14} />
                </a>
              </div>
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
