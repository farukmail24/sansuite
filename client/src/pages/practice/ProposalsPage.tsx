import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AppLayout from "../../components/layout/AppLayout";
import { practiceSidebar } from "./sidebar";
import { useToast } from "../../hooks/useToast";
import {
  FileSignature, Plus, Search, ExternalLink,
  CheckCircle2, Clock, Eye, Send, FileText,
  DollarSign, ShieldCheck, Download, Copy
} from "lucide-react";
import { apiRequest } from "../../lib/queryClient";
import QuickAddModal from "../../components/practice/QuickAddModal";

export default function ProposalsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [isGenerateOpen, setIsGenerateOpen] = useState(false);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);

  // Proposal Generator Form State
  const [clientId, setClientId] = useState("");
  const [prospectName, setProspectName] = useState("");
  const [prospectEmail, setProspectEmail] = useState("");
  const [documentTitle, setDocumentTitle] = useState("Letter of Engagement & Fee Schedule 2026");
  const [totalFeeQuoted, setTotalFeeQuoted] = useState("1200.00");
  const [selectedServices, setSelectedServices] = useState<string[]>([
    "Accounts Production (FRS 102/105)",
    "Corporation Tax (CT600)",
    "Quarterly MTD VAT Returns"
  ]);

  // Fetch Proposals & LoE Documents
  const { data: documents = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/pm/loe"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/pm/loe");
      if (!res.ok) return [];
      return res.json();
    }
  });

  // Fetch Clients
  const { data: clientsList = [] } = useQuery<any[]>({
    queryKey: ["/api/pm/clients"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/pm/clients");
      if (!res.ok) return [];
      return res.json();
    }
  });

  // Generate Proposal Mutation
  const generateMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/pm/loe/generate", {
        clientId: clientId || null,
        prospectName: prospectName || (clientsList.find(c => String(c.id) === clientId)?.clientName),
        prospectEmail,
        documentTitle,
        totalFeeQuoted,
        servicesIncluded: selectedServices,
      });
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/pm/loe"] });
      toast({ title: "Engagement Document Generated", description: "Signing link ready." });
      setIsGenerateOpen(false);
    },
    onError: (err: any) => {
      toast({ title: "Generation failed", description: err.message, variant: "destructive" });
    }
  });

  // Dispatch Email Mutation
  const sendMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("POST", `/api/pm/loe/${id}/send`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pm/loe"] });
      toast({ title: "Dispatched to Client", description: "Email sent with secure e-sign link." });
    }
  });

  const handleCopySigningLink = (token: string) => {
    const fullUrl = `${window.location.origin}/public/sign/${token}`;
    navigator.clipboard.writeText(fullUrl);
    toast({ title: "Link Copied to Clipboard", description: fullUrl });
  };

  const filteredDocs = documents.filter((d) => {
    const q = searchQuery.toLowerCase();
    return (
      d.documentTitle?.toLowerCase().includes(q) ||
      d.prospectName?.toLowerCase().includes(q) ||
      d.clientName?.toLowerCase().includes(q)
    );
  });

  return (
    <AppLayout sidebar={practiceSidebar} module="Practice Management">
      <div className="p-6 w-full mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <FileSignature className="text-indigo-600 dark:text-indigo-400" size={24} />
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Letters of Engagement & Proposals</h1>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Create professional engagement contracts, fee schedules & legally-binding Capisign electronic signature workflows.
            </p>
          </div>

          <button
            onClick={() => setIsGenerateOpen(true)}
            className="px-4 py-2 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-sm flex items-center gap-1.5"
          >
            <Plus size={15} />
            Create Proposal / LoE
          </button>
        </div>

        {/* Filter Search Bar */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
          <input
            type="text"
            placeholder="Search proposals or signers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none"
          />
        </div>

        {/* Proposals Grid */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Document Title</th>
                  <th className="py-3 px-4">Prospect / Client</th>
                  <th className="py-3 px-4">Quoted Fee</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Signed Date / Signer</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">Loading engagement proposals...</td>
                  </tr>
                ) : filteredDocs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">No proposal documents generated yet.</td>
                  </tr>
                ) : (
                  filteredDocs.map((doc) => {
                    const isSigned = doc.status === "Signed";
                    const isViewed = doc.status === "Viewed";
                    const isSent = doc.status === "Sent";

                    return (
                      <tr key={doc.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-700/40 transition-colors">
                        <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                          <FileText size={15} className="text-indigo-600 dark:text-indigo-400" />
                          {doc.documentTitle}
                        </td>
                        <td className="py-3.5 px-4 font-medium text-slate-800 dark:text-slate-200">
                          {doc.clientName || doc.prospectName}
                          <span className="block text-[10px] text-slate-400">{doc.prospectEmail || "—"}</span>
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-slate-100">
                          £{doc.totalFeeQuoted}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-semibold inline-flex items-center gap-1 ${isSigned
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                              : isViewed
                                ? "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300"
                                : isSent
                                  ? "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300"
                                  : "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                              }`}
                          >
                            {isSigned && <CheckCircle2 size={10} />}
                            {isViewed && <Eye size={10} />}
                            {isSent && <Send size={10} />}
                            {doc.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">
                          {isSigned ? (
                            <div>
                              <p className="font-semibold text-emerald-700 dark:text-emerald-400">{doc.signeeName || "Signed"}</p>
                              <p className="text-[10px] text-slate-400">{new Date(doc.signedAt).toLocaleString("en-GB")}</p>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">Awaiting client signature</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleCopySigningLink(doc.publicSignToken)}
                              title="Copy E-Sign Link"
                              className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md transition-colors"
                            >
                              <Copy size={13} />
                            </button>
                            <a
                              href={`/public/sign/${doc.publicSignToken}`}
                              target="_blank"
                              rel="noreferrer"
                              title="Open Signing Portal"
                              className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md transition-colors"
                            >
                              <ExternalLink size={13} />
                            </a>
                            {!isSigned && (
                              <button
                                onClick={() => sendMutation.mutate(doc.id)}
                                className="px-2.5 py-1 text-[11px] font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md transition-colors"
                              >
                                Send Link
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal: Create Engagement Proposal */}
        {isGenerateOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl w-full max-w-lg p-6 space-y-4 text-xs">
              <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">Create Letter of Engagement / Proposal</h3>

              <div className="space-y-3">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Target Existing Client or Prospect</label>
                  <select
                    value={clientId}
                    onChange={(e) => {
                      setClientId(e.target.value);
                      const cl = clientsList.find(c => String(c.id) === e.target.value);
                      if (cl) {
                        setProspectName(cl.clientName);
                        if (cl.email) setProspectEmail(cl.email);
                      }
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  >
                    <option value="">-- New Prospect (Not in Client List) --</option>
                    {clientsList.map(c => <option key={c.id} value={c.id}>{c.clientName}</option>)}
                  </select>
                </div>

                {!clientId && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Prospect / Company Name *</label>
                      <input
                        type="text"
                        placeholder="e.g. Acme Trading Ltd"
                        value={prospectName}
                        onChange={(e) => setProspectName(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                      />
                    </div>
                    <div>
                      <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Email Address *</label>
                      <input
                        type="email"
                        placeholder="director@company.com"
                        value={prospectEmail}
                        onChange={(e) => setProspectEmail(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                      />

                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Document Title</label>
                    <input
                      type="text"
                      value={documentTitle}
                      onChange={(e) => setDocumentTitle(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Quoted Annual Fee (£)</label>
                    <input
                      type="number"
                      value={totalFeeQuoted}
                      onChange={(e) => setTotalFeeQuoted(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Contracted Services Included</label>
                  <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 space-y-1.5">
                    {[
                      "Accounts Production (FRS 102/105)",
                      "Corporation Tax (CT600)",
                      "Quarterly MTD VAT Returns",
                      "Monthly Payroll & RTI",
                      "Confirmation Statement (CS01)",
                      "Making Tax Digital for Income Tax (MTD IT)",
                    ].map((srv) => (
                      <label key={srv} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedServices.includes(srv)}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedServices([...selectedServices, srv]);
                            else setSelectedServices(selectedServices.filter(s => s !== srv));
                          }}
                          className="rounded text-indigo-600"
                        />
                        <span className="text-[11px] text-slate-700 dark:text-slate-300">{srv}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button onClick={() => setIsGenerateOpen(false)} className="px-3 py-1.5 text-slate-500">Cancel</button>
                <button
                  disabled={(!clientId && !prospectName) || generateMutation.isPending}
                  onClick={() => generateMutation.mutate()}
                  className="px-4 py-1.5 font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg disabled:opacity-50"
                >
                  {generateMutation.isPending ? "Generating..." : "Generate & Ready Link"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Global Quick Add Modal */}
        <QuickAddModal isOpen={isQuickAddOpen} onClose={() => setIsQuickAddOpen(false)} clientsList={clientsList} />
      </div>
    </AppLayout>
  );
}
