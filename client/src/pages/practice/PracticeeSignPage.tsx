import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AppLayout from "../../components/layout/AppLayout";
import { practiceSidebar } from "./sidebar";
import { useToast } from "../../hooks/useToast";
import {
  FileSignature, Plus, Search, Filter,
  Calendar, CheckCircle2, Clock, AlertCircle,
  Download, Eye, Send, Trash2, X, Info,
  Building2, User, ExternalLink, ShieldCheck, Check
} from "lucide-react";
import { apiRequest } from "../../lib/queryClient";

export default function PracticeeSignPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Sub-Tabs: "docs" (Documents List) | "audit" (AuditLog)
  const [activeTab, setActiveTab] = useState<"docs" | "audit">("docs");

  // Filters State for Documents List
  const [filterDueDate, setFilterDueDate] = useState("All");
  const [filterClient, setFilterClient] = useState("All");
  const [filterDocType, setFilterDocType] = useState("All");
  const [docSearchQuery, setDocSearchQuery] = useState("");

  // Filters State for AuditLog
  const [auditSearchQuery, setAuditSearchQuery] = useState("");
  const [auditStatusFilter, setAuditStatusFilter] = useState("All");
  const [auditClientTypeFilter, setAuditClientTypeFilter] = useState("All");
  const [auditClientFilter, setAuditClientFilter] = useState("All");
  const [auditDocTypeFilter, setAuditDocTypeFilter] = useState("All");
  const [auditSignedDate, setAuditSignedDate] = useState("");

  // Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    title: "",
    clientId: "",
    signerName: "",
    signerEmail: "",
    docType: "Accounts",
    dueDate: "",
    reminderFrequency: "Weekly",
    notes: "",
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

  // Fetch Practice LoE / eSign Documents
  const { data: documentsList = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/pm/proposals"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/pm/loe");
      if (!res.ok) return [];
      return res.json();
    }
  });

  // Fetch Standalone eSign Documents as complementary source
  const { data: esignDocs = [] } = useQuery<any[]>({
    queryKey: ["/api/esign/documents"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/esign/documents");
      if (!res.ok) return [];
      return res.json();
    }
  });

  // Create Document Mutation
  const createDocumentMutation = useMutation({
    mutationFn: async (payload: any) => {
      return await apiRequest("POST", "/api/esign/documents", {
        title: payload.title,
        sourceModule: "Practice Management",
        signerEmail: payload.signerEmail,
        signerName: payload.signerName,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/esign/documents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/pm/proposals"] });
      toast({ title: "eSign Document Created", description: "Signature link generated and dispatched." });
      setIsCreateModalOpen(false);
      setCreateForm({
        title: "",
        clientId: "",
        signerName: "",
        signerEmail: "",
        docType: "Accounts",
        dueDate: "",
        reminderFrequency: "Weekly",
        notes: "",
      });
    },
    onError: (err: any) => {
      toast({ title: "Failed to create document", description: err.message, variant: "destructive" });
    }
  });

  // Date Formatter
  const formatDate = (dStr: string | null | undefined) => {
    if (!dStr) return "-";
    const d = new Date(dStr);
    if (isNaN(d.getTime())) return dStr;
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
  };

  // Merged Document List
  const allDocs = useMemo(() => {
    const fromLoE = documentsList.map((d: any) => ({
      id: d.id,
      clientName: d.clientName || d.prospectName || "Client",
      title: d.documentTitle || d.proposalTitle || "Letter of Engagement",
      to: d.prospectEmail || d.email || "-",
      reference: `SAN-DOC-${String(d.id).padStart(4, "0")}`,
      createdOn: d.createdAt,
      reminderDate: d.lastReminderSentAt || d.createdAt,
      dueDate: d.dueDate || d.createdAt,
      status: d.status || "Signed",
      publicSignToken: d.publicSignToken,
      docType: "Letter of Engagement",
    }));

    const fromeSign = esignDocs.map((d: any) => ({
      id: d.id + 1000,
      clientName: d.clientName || d.signerName || "Client",
      title: d.title || "Annual Accounts Declaration",
      to: d.signerEmail || d.email || "-",
      reference: `SAN-SS-${String(d.id).padStart(4, "0")}`,
      createdOn: d.createdAt,
      reminderDate: d.createdAt,
      dueDate: d.createdAt,
      status: d.status === "Signed" ? "Signed" : "AwaitingApproval",
      publicSignToken: d.verificationToken,
      docType: "Accounts",
    }));

    return [...fromLoE, ...fromeSign];
  }, [documentsList, esignDocs]);


  // Filtered Documents
  const filteredDocs = useMemo(() => {
    return allDocs.filter((d: any) => {
      if (filterClient !== "All" && d.clientName !== filterClient) return false;
      if (filterDocType !== "All" && d.docType !== filterDocType) return false;
      if (docSearchQuery.trim()) {
        const q = docSearchQuery.toLowerCase();
        const matchTitle = (d.title || "").toLowerCase().includes(q);
        const matchClient = (d.clientName || "").toLowerCase().includes(q);
        const matchRef = (d.reference || "").toLowerCase().includes(q);
        const matchTo = (d.to || "").toLowerCase().includes(q);
        if (!matchTitle && !matchClient && !matchRef && !matchTo) return false;
      }
      return true;
    });
  }, [allDocs, filterClient, filterDocType, docSearchQuery]);

  // Filtered AuditLog items
  const filteredAuditLogs = useMemo(() => {
    return allDocs.filter((d: any) => {
      if (auditStatusFilter !== "All" && d.status?.toLowerCase() !== auditStatusFilter.toLowerCase()) return false;
      if (auditClientFilter !== "All" && d.clientName !== auditClientFilter) return false;
      if (auditDocTypeFilter !== "All" && d.docType !== auditDocTypeFilter) return false;
      if (auditSearchQuery.trim()) {
        const q = auditSearchQuery.toLowerCase();
        const matchTitle = (d.title || "").toLowerCase().includes(q);
        const matchClient = (d.clientName || "").toLowerCase().includes(q);
        const matchRef = (d.reference || "").toLowerCase().includes(q);
        if (!matchTitle && !matchClient && !matchRef) return false;
      }
      return true;
    });
  }, [allDocs, auditStatusFilter, auditClientFilter, auditDocTypeFilter, auditSearchQuery]);

  return (
    <AppLayout sidebar={practiceSidebar} module="Practice Management">
      <div className="bg-slate-50 dark:bg-slate-950 min-h-screen pb-16 w-full text-slate-800 dark:text-slate-200">

        {/* Top Two Sub-Tabs: Documents List | AuditLog */}
        <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 pt-3 flex items-center gap-6 shadow-2xs">
          <button
            onClick={() => setActiveTab("docs")}
            className={`py-2.5 px-3 text-xs font-semibold tracking-tight transition-all relative cursor-pointer ${activeTab === "docs"
              ? "text-purple-700 dark:text-purple-400 font-bold border-b-2 border-purple-600"
              : "text-slate-500 hover:text-slate-800"
              }`}
          >
            Documents List
          </button>
          <button
            onClick={() => setActiveTab("audit")}
            className={`py-2.5 px-3 text-xs font-semibold tracking-tight transition-all relative cursor-pointer ${activeTab === "audit"
              ? "text-purple-700 dark:text-purple-400 font-bold border-b-2 border-purple-600"
              : "text-slate-500 hover:text-slate-800"
              }`}
          >
            AuditLog
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* ========================================================= */}
          {/* TAB 1: DOCUMENTS LIST (Screenshot 1)                      */}
          {/* ========================================================= */}
          {activeTab === "docs" && (
            <div className="space-y-4">

              {/* Top Filter Bar & Create Button */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">

                {/* Left Heading & Quick Search */}
                <div className="flex items-center gap-3">
                  <span className="font-bold text-sm text-slate-900 dark:text-slate-100 whitespace-nowrap">
                    List of Documents
                  </span>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Quick Search"
                      value={docSearchQuery}
                      onChange={(e) => setDocSearchQuery(e.target.value)}
                      className="border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800 focus:outline-hidden focus:ring-1 focus:ring-purple-500 w-56"
                    />
                  </div>
                </div>

                {/* Right Filter Selectors & Action Button */}
                <div className="flex flex-wrap items-center gap-3">
                  <select
                    value={filterDueDate}
                    onChange={(e) => setFilterDueDate(e.target.value)}
                    className="border border-slate-300 dark:border-slate-700 rounded text-xs px-3 py-1.5 bg-white dark:bg-slate-800 min-w-[130px]"
                  >
                    <option value="All">Due Date - All</option>
                    <option value="Today">Due Today</option>
                    <option value="ThisWeek">Due This Week</option>
                    <option value="Overdue">Overdue</option>
                  </select>

                  <select
                    value={filterClient}
                    onChange={(e) => setFilterClient(e.target.value)}
                    className="border border-slate-300 dark:border-slate-700 rounded text-xs px-3 py-1.5 bg-white dark:bg-slate-800 min-w-[140px]"
                  >
                    <option value="All">Client - All</option>
                    {clientsList.map((c: any) => (
                      <option key={c.id} value={c.clientName}>
                        {c.clientName}
                      </option>
                    ))}
                  </select>

                  <select
                    value={filterDocType}
                    onChange={(e) => setFilterDocType(e.target.value)}
                    className="border border-slate-300 dark:border-slate-700 rounded text-xs px-3 py-1.5 bg-white dark:bg-slate-800 min-w-[150px]"
                  >
                    <option value="All">Document Type - All</option>
                    <option value="Letter of Engagement">Letter of Engagement</option>
                    <option value="Accounts">Annual Accounts</option>
                    <option value="Tax Return">Corporation Tax CT600</option>
                    <option value="Section 64-8">HMRC Authorisation 64-8</option>
                  </select>

                  <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="bg-[#5c469c] hover:bg-[#4b3882] text-white text-xs font-semibold px-4 py-1.5 rounded transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus size={13} /> Create New Document
                  </button>
                </div>

              </div>

              {/* Documents Table */}
              <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
                        <th className="py-2.5 px-3 w-8">#</th>
                        <th className="py-2.5 px-3">Client ▼</th>
                        <th className="py-2.5 px-3">Title ▼</th>
                        <th className="py-2.5 px-3">To ▼</th>
                        <th className="py-2.5 px-3">Reference ▼</th>
                        <th className="py-2.5 px-3">Created On ▼</th>
                        <th className="py-2.5 px-3">Reminder Date ▼</th>
                        <th className="py-2.5 px-3">Due Date ▼</th>
                        <th className="py-2.5 px-3">Status ▼</th>
                        <th className="py-2.5 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredDocs.length === 0 ? (
                        <tr>
                          <td colSpan={10} className="text-center py-12 text-purple-600 dark:text-purple-400 font-medium text-xs">
                            No Records found
                          </td>
                        </tr>
                      ) : (
                        filteredDocs.map((doc: any, index: number) => (
                          <tr key={doc.id} className="border-b border-slate-100 dark:border-slate-800/60 hover:bg-slate-50/50">
                            <td className="py-2.5 px-3 text-slate-400 font-mono">{index + 1}</td>
                            <td className="py-2.5 px-3 font-semibold text-slate-800 dark:text-slate-200">
                              {doc.clientName}
                            </td>
                            <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300 font-medium">
                              {doc.title}
                            </td>
                            <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400 font-mono">
                              {doc.to}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-purple-600 font-semibold">
                              {doc.reference}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-slate-500">
                              {formatDate(doc.createdOn)}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-slate-500">
                              {formatDate(doc.reminderDate)}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-slate-500">
                              {formatDate(doc.dueDate)}
                            </td>
                            <td className="py-2.5 px-3">
                              {doc.status === "Signed" ? (
                                <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                                  Signed
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                                  {doc.status}
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <button
                                onClick={() => toast({ title: "eSign Preview", description: `Viewing document ${doc.reference}` })}
                                className="text-purple-600 hover:text-purple-800 font-medium text-xs cursor-pointer"
                              >
                                View
                              </button>
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

          {/* ========================================================= */}
          {/* TAB 2: AUDITLOG (Screenshot 2)                            */}
          {/* ========================================================= */}
          {activeTab === "audit" && (
            <div className="space-y-4">

              {/* Audit Filter Controls Bar */}
              <div className="bg-white dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-wrap items-center gap-3">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Quick Search"
                    value={auditSearchQuery}
                    onChange={(e) => setAuditSearchQuery(e.target.value)}
                    className="border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800 focus:outline-hidden focus:ring-1 focus:ring-purple-500 w-56"
                  />
                </div>

                <select
                  value={auditStatusFilter}
                  onChange={(e) => setAuditStatusFilter(e.target.value)}
                  className="border border-slate-300 dark:border-slate-700 rounded text-xs px-3 py-1.5 bg-white dark:bg-slate-800 min-w-[120px]"
                >
                  <option value="All">Status - All</option>
                  <option value="Signed">Signed</option>
                  <option value="Sent">Sent</option>
                  <option value="Viewed">Viewed</option>
                </select>

                <select
                  value={auditClientTypeFilter}
                  onChange={(e) => setAuditClientTypeFilter(e.target.value)}
                  className="border border-slate-300 dark:border-slate-700 rounded text-xs px-3 py-1.5 bg-white dark:bg-slate-800 min-w-[130px]"
                >
                  <option value="All">Client Types - All</option>
                  <option value="Limited">Limited</option>
                  <option value="Partnership">Partnership</option>
                  <option value="SoleTrader">Sole Trader</option>
                </select>

                <select
                  value={auditClientFilter}
                  onChange={(e) => setAuditClientFilter(e.target.value)}
                  className="border border-slate-300 dark:border-slate-700 rounded text-xs px-3 py-1.5 bg-white dark:bg-slate-800 min-w-[140px]"
                >
                  <option value="All">Client - All</option>
                  {clientsList.map((c: any) => (
                    <option key={c.id} value={c.clientName}>
                      {c.clientName}
                    </option>
                  ))}
                </select>

                <select
                  value={auditDocTypeFilter}
                  onChange={(e) => setAuditDocTypeFilter(e.target.value)}
                  className="border border-slate-300 dark:border-slate-700 rounded text-xs px-3 py-1.5 bg-white dark:bg-slate-800 min-w-[150px]"
                >
                  <option value="All">Document Type - All</option>
                  <option value="Letter of Engagement">Letter of Engagement</option>
                  <option value="Accounts">Annual Accounts</option>
                </select>

                <div className="flex items-center gap-1">
                  <input
                    type="date"
                    value={auditSignedDate}
                    onChange={(e) => setAuditSignedDate(e.target.value)}
                    className="border border-slate-300 dark:border-slate-700 rounded text-xs px-3 py-1.5 bg-white dark:bg-slate-800 text-slate-700"
                  />
                  <Search size={14} className="text-slate-400 cursor-pointer" />
                </div>
              </div>

              {/* AuditLog Table (Screenshot 2) */}
              <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
                        <th className="py-2.5 px-4">Reference</th>
                        <th className="py-2.5 px-4">Client</th>
                        <th className="py-2.5 px-4">Document</th>
                        <th className="py-2.5 px-4">Date</th>
                        <th className="py-2.5 px-4">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAuditLogs.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="text-center py-12 text-purple-600 dark:text-purple-400 font-medium text-xs">
                            No Records found
                          </td>
                        </tr>
                      ) : (
                        filteredAuditLogs.map((log: any) => (
                          <tr key={log.id} className="border-b border-slate-100 dark:border-slate-800/60 hover:bg-slate-50/50">
                            <td className="py-2.5 px-4 font-mono font-semibold text-purple-600">{log.reference}</td>
                            <td className="py-2.5 px-4 font-semibold text-slate-800 dark:text-slate-200">{log.clientName}</td>
                            <td className="py-2.5 px-4 text-slate-700 dark:text-slate-300">{log.title}</td>
                            <td className="py-2.5 px-4 font-mono text-slate-500">{formatDate(log.createdOn)}</td>
                            <td className="py-2.5 px-4">
                              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                                {log.status}
                              </span>
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

        </div>
      </div>

      {/* ========================================================= */}
      {/* MODAL: CREATE NEW DOCUMENT (Exact Capium Screenshot 1:1)   */}
      {/* ========================================================= */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-2xl max-w-2xl w-full overflow-hidden text-xs my-8">

            {/* Modal Header */}
            <div className="px-6 py-4 flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">
                Create New Document
              </h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X size={16} />
              </button>
            </div>

            {/* Dotted Divider */}
            <div className="border-b border-dotted border-slate-300 dark:border-slate-700 mx-6"></div>

            {/* Modal Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!createForm.title || !createForm.signerEmail) {
                  toast({
                    title: "Validation Error",
                    description: "Title and To (Signer Email) are required.",
                    variant: "destructive"
                  });
                  return;
                }
                createDocumentMutation.mutate(createForm);
              }}
              className="p-6 space-y-4"
            >
              {/* Field 1: Client * */}
              <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2">
                <label className="text-slate-700 dark:text-slate-300 font-medium sm:col-span-1">
                  Client <span className="text-red-500">*</span>
                </label>
                <div className="sm:col-span-3">
                  <select
                    value={createForm.clientId}
                    onChange={(e) => {
                      const sel = clientsList.find((c: any) => String(c.id) === e.target.value);
                      const randRef = `SAN-REF-${Math.floor(1000 + Math.random() * 9000)}`;
                      setCreateForm({
                        ...createForm,
                        clientId: e.target.value,
                        signerName: sel?.clientName || "",
                        signerEmail: sel?.email || "accounts@" + (sel?.clientName?.toLowerCase().replace(/[^a-z0-9]/g, '') || "client") + ".co.uk",
                        title: sel ? `Annual Accounts & Tax Filing - ${sel.clientName}` : "",
                        notes: randRef,
                      });
                    }}
                    className="w-full border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-xs bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-purple-500"
                    required
                  >
                    <option value="">Select Client</option>
                    {clientsList.map((c: any) => (
                      <option key={c.id} value={c.id}>
                        {c.clientName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Field 2: Title * */}
              <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2">
                <label className="text-slate-700 dark:text-slate-300 font-medium sm:col-span-1">
                  Title <span className="text-red-500">*</span>
                </label>
                <div className="sm:col-span-3">
                  <input
                    type="text"
                    placeholder="Enter Title"
                    value={createForm.title}
                    onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                    className="w-full border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-xs bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-purple-500"
                    required
                  />
                </div>
              </div>

              {/* Field 3: To * */}
              <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2">
                <label className="text-slate-700 dark:text-slate-300 font-medium sm:col-span-1">
                  To <span className="text-red-500">*</span>
                </label>
                <div className="sm:col-span-3">
                  <input
                    type="email"
                    placeholder="To (Recipient Email)"
                    value={createForm.signerEmail}
                    onChange={(e) => setCreateForm({ ...createForm, signerEmail: e.target.value })}
                    className="w-full border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-xs bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-purple-500"
                    required
                  />
                </div>
              </div>

              {/* Field 4: CC */}
              <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2">
                <label className="text-slate-700 dark:text-slate-300 font-medium sm:col-span-1">
                  CC
                </label>
                <div className="sm:col-span-3">
                  <input
                    type="text"
                    placeholder="CC"
                    value={createForm.signerName}
                    onChange={(e) => setCreateForm({ ...createForm, signerName: e.target.value })}
                    className="w-full border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-xs bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-purple-500"
                  />
                </div>
              </div>

              {/* Field 5: Reference * */}
              <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2">
                <label className="text-slate-700 dark:text-slate-300 font-medium sm:col-span-1">
                  Reference <span className="text-red-500">*</span>
                </label>
                <div className="sm:col-span-3">
                  <input
                    type="text"
                    placeholder="Enter Reference"
                    value={createForm.notes || "SAN-REF-8492"}
                    onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
                    className="w-full border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-xs bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-purple-500"
                    required
                  />
                </div>
              </div>

              {/* Field 6: Template * */}
              <div className="grid grid-cols-1 sm:grid-cols-4 items-start gap-2">
                <label className="text-slate-700 dark:text-slate-300 font-medium sm:col-span-1 pt-2">
                  Template <span className="text-red-500">*</span>
                </label>
                <div className="sm:col-span-3 space-y-2">
                  <select
                    value={createForm.docType}
                    onChange={(e) => setCreateForm({ ...createForm, docType: e.target.value })}
                    className="w-full border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-xs bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-purple-500"
                  >
                    <option value="">Select Template</option>
                    <option value="Letter of Engagement">Standard Letter of Engagement (LoE)</option>
                    <option value="Accounts">Annual Accounts Approval Letter</option>
                    <option value="Tax Return">CT600 Corporation Tax Authorisation</option>
                    <option value="Section 64-8">HMRC 64-8 Agent Authorisation</option>
                    <option value="VAT Return">MTD VAT Return Sign-Off</option>
                  </select>

                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    (OR) [Hint: Either you can select the template or Upload the file ]
                  </div>

                  <div>
                    <label className="inline-block bg-[#5c469c] hover:bg-[#4b3882] text-white text-xs font-semibold px-4 py-1.5 rounded cursor-pointer transition shadow-xs">
                      Upload File
                      <input
                        type="file"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            toast({
                              title: "File Selected",
                              description: `${file.name} (${(file.size / 1024).toFixed(1)} KB) ready for eSign dispatch.`
                            });
                          }
                        }}
                      />
                    </label>
                  </div>
                </div>
              </div>

              {/* Field 7: Message */}
              <div className="grid grid-cols-1 sm:grid-cols-4 items-start gap-2">
                <label className="text-slate-700 dark:text-slate-300 font-medium sm:col-span-1 pt-2">
                  Message
                </label>
                <div className="sm:col-span-3">
                  <textarea
                    rows={5}
                    placeholder="Type in your Message"
                    className="w-full border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-xs bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-purple-500"
                  />
                </div>
              </div>

              {/* Field 8: Document Type * */}
              <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2">
                <label className="text-slate-700 dark:text-slate-300 font-medium sm:col-span-1">
                  Document Type <span className="text-red-500">*</span>
                </label>
                <div className="sm:col-span-3">
                  <select
                    value={createForm.docType}
                    onChange={(e) => setCreateForm({ ...createForm, docType: e.target.value })}
                    className="w-full border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-xs bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-purple-500"
                    required
                  >
                    <option value="">Select Document Type</option>
                    <option value="Accounts">Annual Accounts (FRS 102 / 105)</option>
                    <option value="Tax Return">Corporation Tax Return (CT600)</option>
                    <option value="Letter of Engagement">Letter of Engagement (LoE)</option>
                    <option value="Section 64-8">HMRC Authorisation (64-8)</option>
                    <option value="Custom">Custom Practice Document</option>
                  </select>
                </div>
              </div>

              {/* Field 9: Select Date * (3 horizontal date fields) */}
              <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2">
                <label className="text-slate-700 dark:text-slate-300 font-medium sm:col-span-1">
                  Select Date <span className="text-red-500">*</span>
                </label>
                <div className="sm:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <input
                      type="date"
                      placeholder="Start Date"
                      className="w-full border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-xs bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                    />
                  </div>
                  <div>
                    <input
                      type="date"
                      placeholder="Expiry Date"
                      value={createForm.dueDate}
                      onChange={(e) => setCreateForm({ ...createForm, dueDate: e.target.value })}
                      className="w-full border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-xs bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                    />
                  </div>
                  <div>
                    <input
                      type="date"
                      placeholder="Reminder Date"
                      className="w-full border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-xs bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                    />
                  </div>
                </div>
              </div>

              {/* Modal Footer: Confirm Upload Button */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="submit"
                  disabled={createDocumentMutation.isPending}
                  className="bg-[#5c469c] hover:bg-[#4b3882] text-white text-xs font-semibold px-5 py-2 rounded transition-colors shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {createDocumentMutation.isPending ? "Uploading & Dispatching..." : "Confirm Upload"}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </AppLayout>
  );
}
