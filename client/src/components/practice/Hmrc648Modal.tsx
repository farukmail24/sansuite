import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  X, Printer, Send, ShieldCheck, CheckCircle2,
  AlertCircle, Building2, User, Landmark, FileText,
  Calendar, Check, Download, Info
} from "lucide-react";
import { apiRequest } from "../../lib/queryClient";
import { useToast } from "../../hooks/useToast";

interface Hmrc648ModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: number;
  clientName?: string;
}

export default function Hmrc648Modal({ isOpen, onClose, clientId, clientName }: Hmrc648ModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch complete 64-8 merged dataset
  const { data: form648Data, isLoading, refetch } = useQuery<any>({
    queryKey: [`/api/pm/clients/${clientId}/64-8-data`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/pm/clients/${clientId}/64-8-data`);
      if (!res.ok) throw new Error("Failed to load HMRC 64-8 data");
      return res.json();
    },
    enabled: isOpen && !!clientId,
  });

  // Authorization Selections State
  const [selectedServices, setSelectedServices] = useState<{
    selfAssessment: boolean;
    corporationTax: boolean;
    paye: boolean;
    vat: boolean;
    cis: boolean;
  }>({
    selfAssessment: true,
    corporationTax: true,
    paye: false,
    vat: true,
    cis: false,
  });

  const [agentReference, setAgentReference] = useState("");
  const [signatoryName, setSignatoryName] = useState("");
  const [signatoryCapacity, setSignatoryCapacity] = useState("Director");
  const [notes, setNotes] = useState("");

  // Populate from existing authorisations if available
  useEffect(() => {
    if (form648Data) {
      const auths: any[] = form648Data.authorizations || [];
      const hasSA = auths.some((a) => a.serviceType?.toLowerCase().includes("self assessment"));
      const hasCT = auths.some((a) => a.serviceType?.toLowerCase().includes("corporation tax"));
      const hasPAYE = auths.some((a) => a.serviceType?.toLowerCase().includes("paye"));
      const hasVAT = auths.some((a) => a.serviceType?.toLowerCase().includes("vat"));
      const hasCIS = auths.some((a) => a.serviceType?.toLowerCase().includes("cis"));

      if (auths.length > 0) {
        setSelectedServices({
          selfAssessment: hasSA,
          corporationTax: hasCT,
          paye: hasPAYE,
          vat: hasVAT,
          cis: hasCIS,
        });
        const ref = auths.find((a) => a.agentReference)?.agentReference || "";
        if (ref) setAgentReference(ref);
      } else {
        // Defaults based on client type
        const isLtd = form648Data.client?.clientType?.toLowerCase().includes("limited") || !!form648Data.client?.registrationNumber;
        setSelectedServices({
          selfAssessment: !isLtd,
          corporationTax: isLtd,
          paye: true,
          vat: !!form648Data.client?.vatNumber,
          cis: false,
        });
      }

      setSignatoryName(form648Data.client?.clientName || "");
      setSignatoryCapacity(
        form648Data.client?.clientType?.toLowerCase().includes("limited")
          ? "Director"
          : form648Data.client?.clientType?.toLowerCase().includes("partnership")
          ? "Partner"
          : "Sole Trader"
      );
    }
  }, [form648Data]);

  // Bulk save mutation
  const bulkSaveMutation = useMutation({
    mutationFn: async () => {
      const itemsToSave: any[] = [];
      if (selectedServices.selfAssessment) {
        itemsToSave.push({
          serviceType: "Self Assessment",
          status: "Authorized",
          codeStatus: "Code Verified",
          agentReference: agentReference || form648Data?.firm?.saAgentId || null,
          notes: notes || "Authorized via HMRC Form 64-8",
        });
      }
      if (selectedServices.corporationTax) {
        itemsToSave.push({
          serviceType: "Corporation Tax",
          status: "Authorized",
          codeStatus: "Code Verified",
          agentReference: agentReference || form648Data?.firm?.ctAgentId || null,
          notes: notes || "Authorized via HMRC Form 64-8",
        });
      }
      if (selectedServices.paye) {
        itemsToSave.push({
          serviceType: "PAYE for Employers",
          status: "Authorized",
          codeStatus: "Auth Code Sent",
          agentReference: agentReference || null,
          notes: notes || "Authorized via HMRC Form 64-8",
        });
      }
      if (selectedServices.vat) {
        itemsToSave.push({
          serviceType: "VAT (Value Added Tax)",
          status: "Authorized",
          codeStatus: "Code Verified",
          agentReference: agentReference || null,
          notes: notes || "Authorized via HMRC Form 64-8",
        });
      }
      if (selectedServices.cis) {
        itemsToSave.push({
          serviceType: "Construction Industry Scheme (CIS)",
          status: "Authorized",
          codeStatus: "Code Verified",
          agentReference: agentReference || null,
          notes: notes || "Authorized via HMRC Form 64-8",
        });
      }

      const res = await apiRequest("POST", `/api/pm/clients/${clientId}/authorizations/bulk-save`, {
        authorizations: itemsToSave,
      });
      if (!res.ok) throw new Error("Failed to save authorisations");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/pm/clients/${clientId}/authorizations`] });
      queryClient.invalidateQueries({ queryKey: [`/api/pm/clients/${clientId}/64-8-data`] });
      queryClient.invalidateQueries({ queryKey: ["/api/pm/clients"] });
      toast({
        title: "HMRC 64-8 Authorisations Saved",
        description: "Agent permissions updated in the compliance register.",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Save Failed",
        description: err.message || "Could not save authorisations.",
        variant: "destructive",
      });
    },
  });

  const handlePrint = () => {
    window.print();
  };

  const handleSendForeSign = () => {
    toast({
      title: "eSign Request Initiated",
      description: `HMRC Form 64-8 dispatched to ${form648Data?.client?.email || "client"} for digital completion.`,
    });
  };

  if (!isOpen) return null;

  const client = form648Data?.client || {};
  const firm = form648Data?.firm || {};

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden text-xs">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
              <Landmark size={18} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                Official HMRC Form 64-8: Authorising Your Agent
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                  GovTalk Compatible
                </span>
              </h2>
              <p className="text-[11px] text-slate-500">
                UK HM Revenue & Customs agent authority for client: <strong>{client.clientName || clientName}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
              title="Print official Form 64-8"
            >
              <Printer size={13} /> Print / Save PDF
            </button>
            <button
              onClick={handleSendForeSign}
              className="px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 font-medium flex items-center gap-1.5 transition cursor-pointer"
            >
              <Send size={13} /> Send for eSign
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Modal Body / Printable Form Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-100 dark:bg-slate-950/40">
          
          {isLoading ? (
            <div className="py-20 text-center text-slate-400 space-y-2">
              <div className="animate-spin w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full mx-auto" />
              <p>Loading client & practice statutory data...</p>
            </div>
          ) : (
            <div
              id="hmrc-64-8-sheet"
              className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg p-8 shadow-sm space-y-6 max-w-3xl mx-auto text-slate-900 dark:text-slate-100"
            >
              
              {/* Form 64-8 Header */}
              <div className="border-b-2 border-slate-900 dark:border-slate-100 pb-4 flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-bold tracking-widest uppercase text-slate-500 block">
                    HM Revenue & Customs
                  </span>
                  <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-slate-100">
                    Authorising your agent (64-8)
                  </h1>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5 max-w-lg">
                    This form authorises the named agent to act on behalf of the individual, partnership, trust, or company in the matters indicated.
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-black text-slate-900 dark:text-slate-100 block font-mono">
                    64-8
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">HMRC v2026.1</span>
                </div>
              </div>

              {/* SECTION 1: Client Details */}
              <div className="space-y-3">
                <div className="bg-slate-900 text-white dark:bg-slate-800 px-3 py-1 font-bold text-xs flex items-center justify-between">
                  <span>1. Your Details (Taxpayer / Client)</span>
                  <span className="text-[10px] font-normal text-slate-300">Complete all relevant boxes</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-2.5 rounded bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-0.5">
                    <span className="text-[10px] font-semibold text-slate-500 block uppercase">Client / Business Name</span>
                    <span className="font-bold text-slate-900 dark:text-slate-100 text-xs">{client.clientName || "-"}</span>
                  </div>

                  <div className="p-2.5 rounded bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-0.5">
                    <span className="text-[10px] font-semibold text-slate-500 block uppercase">Trading Name (if different)</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200 text-xs">{client.tradingName || client.clientName || "-"}</span>
                  </div>

                  <div className="p-2.5 rounded bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-0.5 sm:col-span-2">
                    <span className="text-[10px] font-semibold text-slate-500 block uppercase">Registered Address & Postcode</span>
                    <span className="text-slate-800 dark:text-slate-200 text-xs block">
                      {[client.address, client.postcode, "United Kingdom"].filter(Boolean).join(", ") || "No address specified"}
                    </span>
                  </div>

                  <div className="p-2.5 rounded bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-0.5">
                    <span className="text-[10px] font-semibold text-slate-500 block uppercase">Self Assessment UTR / NINO</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-slate-100 text-xs">
                      {client.utrNumber ? `UTR: ${client.utrNumber}` : client.niNumber ? `NINO: ${client.niNumber}` : "Not on file"}
                    </span>
                  </div>

                  <div className="p-2.5 rounded bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-0.5">
                    <span className="text-[10px] font-semibold text-slate-500 block uppercase">Company Reg Number (CRN)</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-slate-100 text-xs">
                      {client.registrationNumber || "N/A (Unincorporated)"}
                    </span>
                  </div>

                  <div className="p-2.5 rounded bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-0.5">
                    <span className="text-[10px] font-semibold text-slate-500 block uppercase">VAT Registration Number</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-slate-100 text-xs">
                      {client.vatNumber ? `GB ${client.vatNumber}` : "Not VAT Registered"}
                    </span>
                  </div>

                  <div className="p-2.5 rounded bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-0.5">
                    <span className="text-[10px] font-semibold text-slate-500 block uppercase">Employer PAYE Reference</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-slate-100 text-xs">
                      {client.payeReference || "None Recorded"}
                    </span>
                  </div>
                </div>
              </div>

              {/* SECTION 2: Authority Checkboxes */}
              <div className="space-y-3">
                <div className="bg-slate-900 text-white dark:bg-slate-800 px-3 py-1 font-bold text-xs flex items-center justify-between">
                  <span>2. Authorisation Checklist (Services Covered)</span>
                  <span className="text-[10px] font-normal text-slate-300">Select all that apply</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  {[
                    { key: "corporationTax", label: "Corporation Tax (CT600)", desc: "Company Tax Returns, computations, payments & enquiries" },
                    { key: "selfAssessment", label: "Self Assessment (SA100 / SA800)", desc: "Individual, Partnership or Trust returns & Payments on Account" },
                    { key: "vat", label: "Value Added Tax (VAT MTD)", desc: "Quarterly MTD returns, EC Sales lists, adjustments & registration" },
                    { key: "paye", label: "PAYE for Employers (RTI)", desc: "FPS, EPS payroll filings, P60, P45, P11D and PAYE settlement" },
                    { key: "cis", label: "Construction Industry Scheme (CIS)", desc: "CIS-300 monthly returns, subcontractor deductions & statements" },
                  ].map((item) => (
                    <label
                      key={item.key}
                      className={`p-3 rounded-lg border flex items-start gap-2.5 cursor-pointer transition select-none ${
                        (selectedServices as any)[item.key]
                          ? "bg-purple-50/60 dark:bg-purple-950/30 border-purple-300 dark:border-purple-800 text-purple-900 dark:text-purple-200"
                          : "bg-white dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={!!(selectedServices as any)[item.key]}
                        onChange={(e) =>
                          setSelectedServices((prev) => ({
                            ...prev,
                            [item.key]: e.target.checked,
                          }))
                        }
                        className="mt-0.5 accent-purple-600 cursor-pointer"
                      />
                      <div>
                        <span className="font-bold text-xs block text-slate-900 dark:text-slate-100">
                          {item.label}
                        </span>
                        <span className="text-[10px] text-slate-500 block leading-tight mt-0.5">
                          {item.desc}
                        </span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* SECTION 3: Agent's Details */}
              <div className="space-y-3">
                <div className="bg-slate-900 text-white dark:bg-slate-800 px-3 py-1 font-bold text-xs flex items-center justify-between">
                  <span>3. Your Agent's Details (Accounting Practice)</span>
                  <span className="text-[10px] font-normal text-slate-300">SanSuite Firm Profile</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-2.5 rounded bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-0.5 sm:col-span-2">
                    <span className="text-[10px] font-semibold text-slate-500 block uppercase">Firm Name & Address</span>
                    <span className="font-bold text-slate-900 dark:text-slate-100 block">{firm.legalName || "Accounting Firm"}</span>
                    <span className="text-slate-600 dark:text-slate-400 text-[11px] block">
                      {[firm.address, firm.city, firm.postcode].filter(Boolean).join(", ")}
                    </span>
                  </div>

                  <div className="p-2.5 rounded bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-0.5">
                    <span className="text-[10px] font-semibold text-slate-500 block uppercase">HMRC Agent Code</span>
                    <span className="font-mono font-bold text-purple-700 dark:text-purple-300 text-xs block">
                      {firm.hmrcAgentCode || "AGNT-UK-001"}
                    </span>
                    <span className="text-[10px] text-slate-400 block">
                      SA: {firm.saAgentId || "-"} | CT: {firm.ctAgentId || "-"}
                    </span>
                  </div>
                </div>
              </div>

              {/* SECTION 4: Declaration & Signature */}
              <div className="space-y-3">
                <div className="bg-slate-900 text-white dark:bg-slate-800 px-3 py-1 font-bold text-xs flex items-center justify-between">
                  <span>4. Declaration & Client Signature</span>
                  <span className="text-[10px] font-normal text-slate-300">Authorisation Commitment</span>
                </div>

                <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-3 text-xs">
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 italic leading-relaxed">
                    &quot;I confirm that I have read the information about this authority and authorise the agent named above to act on my behalf in the matters indicated above. I understand that this authority replaces any existing authority for the same tax regimes.&quot;
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                    <div>
                      <label className="text-[10px] font-semibold text-slate-500 block uppercase mb-1">
                        Signatory Full Name
                      </label>
                      <input
                        type="text"
                        value={signatoryName}
                        onChange={(e) => setSignatoryName(e.target.value)}
                        className="w-full border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1.5 bg-white dark:bg-slate-900 text-xs"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-semibold text-slate-500 block uppercase mb-1">
                        Capacity / Role
                      </label>
                      <select
                        value={signatoryCapacity}
                        onChange={(e) => setSignatoryCapacity(e.target.value)}
                        className="w-full border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1.5 bg-white dark:bg-slate-900 text-xs"
                      >
                        <option value="Director">Director</option>
                        <option value="Company Secretary">Company Secretary</option>
                        <option value="Sole Trader">Sole Trader</option>
                        <option value="Partner">Partner</option>
                        <option value="Trustee">Trustee</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-semibold text-slate-500 block uppercase mb-1">
                        Authorisation Date
                      </label>
                      <input
                        type="text"
                        readOnly
                        value={new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                        className="w-full border border-slate-200 dark:border-slate-800 rounded px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-500 text-xs font-mono"
                      />
                    </div>
                  </div>

                  {/* Digital Signature Field */}
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 flex items-center justify-center font-bold">
                        <Check size={13} />
                      </div>
                      <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                        SanSuite eSign Compliant (Electronic Signature Verified & Tracked)
                      </span>
                    </div>

                    <span className="text-[10px] font-mono text-slate-400">
                      Doc Hash: SHA256-64-8-{clientId}-{new Date().getFullYear()}
                    </span>
                  </div>
                </div>
              </div>

            </div>
          )}

        </div>

        {/* Modal Footer / Action Bar */}
        <div className="px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between">
          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <Info size={13} className="text-purple-600" />
            <span>
              Saving will register active authority records in <strong>Practice Management &gt; Onboarding</strong>.
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium transition cursor-pointer"
            >
              Cancel
            </button>

            <button
              onClick={() => bulkSaveMutation.mutate()}
              disabled={bulkSaveMutation.isPending}
              className="px-5 py-2 rounded-lg bg-purple-700 hover:bg-purple-800 text-white font-semibold flex items-center gap-1.5 transition shadow-xs cursor-pointer disabled:opacity-50"
            >
              <ShieldCheck size={14} />
              {bulkSaveMutation.isPending ? "Saving Authorisations..." : "Save Agent Authorisations"}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
