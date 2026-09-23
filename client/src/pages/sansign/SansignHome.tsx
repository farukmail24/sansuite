import { useState, useRef } from "react";
import { useLocation, useSearch } from "wouter";
import AppLayout from "../../components/layout/AppLayout";
import {
  FileSignature, Send, Edit3, Settings, LayoutTemplate,
  Search, MoreVertical, Info, Download, AlertCircle, FileText,
  Plus, Check, X, Shield, Upload, Trash2, CheckCircle2, Clock
} from "lucide-react";
import { useToast } from "../../hooks/useToast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "../../lib/queryClient";
import GlobalMediaLibraryModal, { MediaFile } from "../../components/common/GlobalMediaLibraryModal";

const sidebar = [
  { label: "Overview", icon: <FileText size={15} />, route: "/sansign" },
  { label: "Sign Documents", icon: <Send size={15} />, route: "/sansign?tab=sign" },
  { label: "My Signature", icon: <Edit3 size={15} />, route: "/sansign?tab=my-signature" },
  { label: "Settings", icon: <Settings size={15} />, route: "/sansign?tab=settings" },
  { label: "Templates", icon: <LayoutTemplate size={15} />, route: "/sansign?tab=templates" },
];

const statusFilters = [
  "All", "Awaiting Approval", "Signed", "Declined", "Drafts", "Cancelled", "Archived"
];

const initialMockDocs = [
  {
    id: 101,
    title: "Annual Accounts Approval 2025/26 - Smith Ltd",
    createdAt: "2026-07-15",
    sourceModule: "Accounts Production",
    fileSize: 450000,
    status: "Awaiting Approval",
    signerName: "John Smith",
    signerEmail: "john@smithltd.co.uk",
    completedAt: null,
  },
  {
    id: 102,
    title: "CT600 Tax Return Authorization - Caplum Tech",
    createdAt: "2026-07-10",
    sourceModule: "Corporation Tax",
    fileSize: 280000,
    status: "Signed",
    signerName: "Caplum Tech Director",
    signerEmail: "director@caplumtech.com",
    completedAt: "2026-07-12",
  },
];

const mockTemplates = [
  {
    id: 1,
    name: "UK Accounting Engagement Letter 2026",
    category: "Onboarding",
    pages: 4,
    fields: 3,
    description: "Standard ICAEW/ACCA compliant engagement letter for annual accounts & tax services."
  },
  {
    id: 2,
    name: "FRS 102 Board Approval Signature Sheet",
    category: "Accounts Production",
    pages: 1,
    fields: 2,
    description: "Director approval sheet for year-end accounts filing to Companies House."
  },
  {
    id: 3,
    name: "CT600 Corporation Tax Filing Authorization",
    category: "Tax Return",
    pages: 2,
    fields: 2,
    description: "Client authorization form to file CT600 return electronically to HMRC."
  },
];

export default function SansignHome() {
  const searchString = useSearch();
  const searchParams = new URLSearchParams(searchString);
  const currentTab = searchParams.get("tab") || "overview";
  const { toast } = useToast();

  const [activeFilter, setActiveFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [localDocs, setLocalDocs] = useState(initialMockDocs);

  // New Request Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<MediaFile | null>(null);

  const [modalForm, setModalForm] = useState({
    title: "",
    clientName: "",
    clientEmail: "",
    docType: "Accounts Production",
    fileName: "",
  });

  const handleMediaSelect = (file: MediaFile) => {
    setSelectedFile(file);
    setModalForm((prev) => ({
      ...prev,
      fileName: file.name,
      title: prev.title || file.name.replace(/\.[^/.]+$/, "").replace(/_/g, " "),
    }));
  };

  // My Signature State
  const [sigType, setSigType] = useState<"draw" | "type">("draw");
  const [typedName, setTypedName] = useState("Arif Ullah");
  const [savedSig, setSavedSig] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // Settings State
  const [reminders, setReminders] = useState(true);
  const [reminderDays, setReminderDays] = useState("3");
  const [auditLog, setAuditLog] = useState(true);
  const [customMsg, setCustomMsg] = useState("Please review and sign the attached document for SanSuite Accountants.");

  // Canvas Handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.beginPath();
    ctx.moveTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.lineTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
    ctx.strokeStyle = "#0984e3";
    ctx.lineWidth = 2.5;
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const handleSaveSignature = () => {
    if (sigType === "draw") {
      const canvas = canvasRef.current;
      if (canvas) {
        setSavedSig(canvas.toDataURL());
      }
    } else {
      setSavedSig(`TYPED:${typedName}`);
    }
    toast({
      title: "Signature Saved",
      description: "Your electronic signature style has been saved successfully.",
    });
  };

  // Create New Signature Request
  const handleCreateRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalForm.title || !modalForm.clientEmail) {
      toast({ title: "Validation Error", description: "Please enter a title and client email." });
      return;
    }

    const newDoc = {
      id: Date.now(),
      title: modalForm.title,
      createdAt: new Date().toISOString().split("T")[0],
      sourceModule: modalForm.docType,
      fileSize: 320000,
      status: "Awaiting Approval",
      signerName: modalForm.clientName || modalForm.clientEmail,
      signerEmail: modalForm.clientEmail,
      completedAt: null,
    };

    setLocalDocs([newDoc, ...localDocs]);
    setIsModalOpen(false);
    setModalForm({ title: "", clientName: "", clientEmail: "", docType: "Accounts Production", fileName: "" });
    toast({
      title: "Signature Request Sent!",
      description: `E-Signature link dispatched to ${modalForm.clientEmail}.`,
    });
  };

  const handleUseTemplate = (templateName: string) => {
    setModalForm({
      ...modalForm,
      title: `${templateName} - ${new Date().getFullYear()}`,
    });
    setIsModalOpen(true);
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    toast({ title: "Settings Updated", description: "Sansign preferences saved cleanly." });
  };

  const filteredDocs = localDocs.filter((d: any) => {
    if (activeFilter !== "All" && d.status !== activeFilter) return false;
    if (search && !d.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <AppLayout sidebar={sidebar} module="SANSIGN">
      <div className="bg-gray-100 min-h-screen pb-12">
        {/* Top Header */}
        <div className="bg-white px-4 py-2 flex items-center justify-between border-b border-gray-200">
          <div className="flex items-center text-sm text-gray-500">
            <span className="flex items-center gap-1 hover:text-[#0984e3] cursor-pointer transition-colors">
              <FileSignature size={14} /> Home
            </span>
            <span className="mx-2">/</span>
            <span className="text-gray-400">Sansign (E-Signature)</span>
            {currentTab !== "overview" && (
              <>
                <span className="mx-2">/</span>
                <span className="text-blue-600 font-semibold capitalize">{currentTab.replace("-", " ")}</span>
              </>
            )}
          </div>
        </div>

        <div className="p-4 max-w-7xl mx-auto">
          {/* Header Area */}
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-6 mt-2 gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-gray-800">
                {currentTab === "overview" && "Document Overview"}
                {currentTab === "sign" && "Send for Signature"}
                {currentTab === "my-signature" && "My Signature"}
                {currentTab === "settings" && "Sansign Settings"}
                {currentTab === "templates" && "Document Templates"}
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                {currentTab === "overview" && "Track all e-signature requests sent from the practice."}
                {currentTab === "sign" && "Upload a PDF, place signature fields, and securely send to clients."}
                {currentTab === "my-signature" && "Customize your default signature style (drawn, typed, or uploaded)."}
                {currentTab === "settings" && "Configure audit trails, notifications, and branding."}
                {currentTab === "templates" && "Manage reusable document layouts with pre-placed fields."}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsModalOpen(true)}
                className="px-4 py-2 text-sm font-medium text-white bg-[#0984e3] hover:bg-[#0873c4] rounded-lg shadow-sm flex items-center gap-2 transition-colors"
              >
                <Send size={16} /> New Signature Request
              </button>
            </div>
          </div>

          {/* TAB 1: OVERVIEW */}
          {currentTab === "overview" && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3 text-blue-800 shadow-sm">
                <Info size={20} className="flex-shrink-0 mt-0.5 text-blue-500" />
                <div className="text-sm">
                  <p className="font-medium">
                    Note: Documents awaiting signature will trigger automated email reminders every 3 days.
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {/* Sub Navigation Tabs */}
                <div className="flex overflow-x-auto border-b border-gray-100 hide-scrollbar bg-gray-50/50">
                  {statusFilters.map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveFilter(tab)}
                      className={`whitespace-nowrap px-6 py-3.5 text-sm font-medium transition-colors border-b-2 ${
                        activeFilter === tab
                          ? "border-[#0984e3] text-[#0984e3] bg-blue-50/50"
                          : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row justify-between gap-4">
                  <div className="relative w-full sm:max-w-md">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search documents by title or signer..."
                      className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[#0984e3] focus:ring-1 focus:ring-[#0984e3] transition-all bg-white"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 text-xs font-semibold text-gray-500 border-b border-gray-200">
                        <th className="px-4 py-3 w-10 text-center"><input type="checkbox" className="rounded text-[#0984e3]" /></th>
                        <th className="px-4 py-3 font-medium uppercase tracking-wider">Title</th>
                        <th className="px-4 py-3 font-medium uppercase tracking-wider">Created On</th>
                        <th className="px-4 py-3 font-medium uppercase tracking-wider">Module Name</th>
                        <th className="px-4 py-3 font-medium uppercase tracking-wider">Size</th>
                        <th className="px-4 py-3 font-medium uppercase tracking-wider">Status</th>
                        <th className="px-4 py-3 font-medium uppercase tracking-wider text-center">Signer Email</th>
                        <th className="px-4 py-3 font-medium uppercase tracking-wider text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm">
                      {filteredDocs.length === 0 ? (
                        <tr><td colSpan={8} className="text-center py-12 text-gray-500">No documents found matching your criteria.</td></tr>
                      ) : (
                        filteredDocs.map((doc: any) => (
                          <tr key={doc.id} className="border-b border-gray-100 hover:bg-blue-50/20">
                            <td className="px-4 py-3 text-center"><input type="checkbox" className="rounded text-[#0984e3]" /></td>
                            <td className="px-4 py-3 font-medium text-gray-800 flex items-center gap-2">
                              <FileText size={16} className="text-blue-500" /> {doc.title}
                            </td>
                            <td className="px-4 py-3 text-gray-600">{doc.createdAt}</td>
                            <td className="px-4 py-3 text-gray-600">
                              <span className="bg-blue-50 text-blue-700 font-semibold px-2 py-1 rounded text-xs">
                                {doc.sourceModule}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-gray-500 text-xs">{Math.round(doc.fileSize / 1024)} KB</td>
                            <td className="px-4 py-3">
                              <span className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${
                                doc.status === 'Signed' ? 'text-green-700 bg-green-100 border-green-200' :
                                doc.status === 'Awaiting Approval' ? 'text-orange-700 bg-orange-100 border-orange-200' :
                                'text-gray-700 bg-gray-100 border-gray-200'
                              }`}>
                                {doc.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center text-gray-700 font-mono text-xs">{doc.signerEmail}</td>
                            <td className="px-4 py-3 text-right">
                              <button
                                onClick={() => toast({ title: "Document Resent", description: `Signature link resent to ${doc.signerEmail}` })}
                                className="px-2.5 py-1 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                              >
                                Resend Link
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

          {/* TAB 2: SIGN DOCUMENTS */}
          {currentTab === "sign" && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 space-y-6">
              <h2 className="text-lg font-bold text-gray-800 border-b pb-3">Send New Document for E-Signature</h2>
              <form onSubmit={handleCreateRequest} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Document Title</label>
                    <input
                      type="text"
                      required
                      value={modalForm.title}
                      onChange={(e) => setModalForm({ ...modalForm, title: e.target.value })}
                      placeholder="e.g. Year-End Accounts Signoff 2026"
                      className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Recipient Client Name</label>
                    <input
                      type="text"
                      required
                      value={modalForm.clientName}
                      onChange={(e) => setModalForm({ ...modalForm, clientName: e.target.value })}
                      placeholder="e.g. John Smith"
                      className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Recipient Email Address</label>
                    <input
                      type="email"
                      required
                      value={modalForm.clientEmail}
                      onChange={(e) => setModalForm({ ...modalForm, clientEmail: e.target.value })}
                      placeholder="client@company.co.uk"
                      className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Module / Document Type</label>
                    <select
                      value={modalForm.docType}
                      onChange={(e) => setModalForm({ ...modalForm, docType: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="Accounts Production">Accounts Production Approval</option>
                      <option value="Corporation Tax">Corporation Tax CT600 Authorization</option>
                      <option value="Onboarding">Engagement Letter</option>
                      <option value="Custom NDA">Non-Disclosure Agreement</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Upload PDF Document</label>
                    {selectedFile ? (
                      <div className="border border-green-300 bg-green-50/60 rounded-xl p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-green-100 text-green-700 rounded-lg flex items-center justify-center">
                            <CheckCircle2 size={20} />
                          </div>
                          <div>
                            <span className="text-xs font-bold text-gray-800 block truncate max-w-[220px]">
                              {selectedFile.name}
                            </span>
                            <span className="text-[10px] text-green-700 font-semibold">
                              {selectedFile.size} • Attached from Media Library
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setIsMediaModalOpen(true)}
                          className="px-3 py-1 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-xs font-semibold rounded-lg shadow-sm"
                        >
                          Change File
                        </button>
                      </div>
                    ) : (
                      <div
                        onClick={() => setIsMediaModalOpen(true)}
                        className="border-2 border-dashed border-gray-300 hover:border-blue-500 rounded-xl p-6 text-center cursor-pointer bg-gray-50 transition-colors group"
                      >
                        <Upload size={24} className="mx-auto text-blue-500 mb-2 group-hover:scale-110 transition-transform" />
                        <span className="text-xs text-gray-600 font-semibold block">Click to Open Global Media Library & Upload PDF</span>
                        <span className="text-[10px] text-gray-400">PDF up to 25MB</span>
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 bg-[#0984e3] hover:bg-[#0873c4] text-white font-semibold text-sm rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2"
                  >
                    <Send size={16} /> Submit & Send E-Signature Request
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 3: MY SIGNATURE */}
          {currentTab === "my-signature" && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 space-y-6">
              <div className="flex items-center justify-between border-b pb-4">
                <div>
                  <h2 className="text-lg font-bold text-gray-800">My Electronic Signature</h2>
                  <p className="text-xs text-gray-500">Create your official digital signature for practice document approvals.</p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setSigType("draw")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${sigType === "draw" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700"}`}
                  >
                    Draw Signature
                  </button>
                  <button
                    onClick={() => setSigType("type")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${sigType === "type" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700"}`}
                  >
                    Type Signature
                  </button>
                </div>
              </div>

              {sigType === "draw" ? (
                <div className="space-y-3">
                  <label className="block text-xs font-semibold text-gray-600">Draw Signature on Pad Below:</label>
                  <div className="border border-gray-300 rounded-xl bg-gray-50 overflow-hidden inline-block relative">
                    <canvas
                      ref={canvasRef}
                      width={500}
                      height={180}
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                      className="cursor-crosshair bg-white"
                    />
                    <button
                      type="button"
                      onClick={clearCanvas}
                      className="absolute top-2 right-2 text-xs text-red-600 hover:underline bg-white px-2 py-1 rounded shadow-sm border"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 max-w-md">
                  <label className="block text-xs font-semibold text-gray-600">Type Your Full Name:</label>
                  <input
                    type="text"
                    value={typedName}
                    onChange={(e) => setTypedName(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="p-4 border rounded-xl bg-gray-50 text-center">
                    <span className="text-2xl font-serif italic text-blue-700 tracking-wider">{typedName || "Your Signature"}</span>
                  </div>
                </div>
              )}

              <div className="border-t pt-4 flex items-center justify-between">
                <span className="text-xs text-gray-500 flex items-center gap-1">
                  <Shield size={14} className="text-green-600" /> 256-bit eIDAS Compliant Digital Certificate Attached
                </span>

                <button
                  onClick={handleSaveSignature}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg shadow-sm transition-colors flex items-center gap-2"
                >
                  <CheckCircle2 size={16} /> Save Signature Style
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: SETTINGS */}
          {currentTab === "settings" && (
            <form onSubmit={handleSaveSettings} className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 space-y-6">
              <h2 className="text-lg font-bold text-gray-800 border-b pb-3">Sansign Preferences & Notifications</h2>

              <div className="space-y-4 max-w-2xl">
                <div className="flex items-center justify-between border-b pb-3">
                  <div>
                    <span className="font-semibold text-sm text-gray-800 block">Automated Email Reminders</span>
                    <span className="text-xs text-gray-500">Send reminder emails automatically to signers for pending documents.</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={reminders}
                    onChange={(e) => setReminders(e.target.checked)}
                    className="w-5 h-5 text-blue-600 rounded"
                  />
                </div>

                {reminders && (
                  <div className="flex items-center justify-between border-b pb-3">
                    <div>
                      <span className="font-semibold text-sm text-gray-800 block">Reminder Frequency</span>
                      <span className="text-xs text-gray-500">Days after initial send date to issue follow-up reminder.</span>
                    </div>
                    <select
                      value={reminderDays}
                      onChange={(e) => setReminderDays(e.target.value)}
                      className="px-3 py-1.5 border rounded-lg text-sm bg-white"
                    >
                      <option value="3">Every 3 Days</option>
                      <option value="7">Every 7 Days</option>
                      <option value="14">Every 14 Days</option>
                    </select>
                  </div>
                )}

                <div className="flex items-center justify-between border-b pb-3">
                  <div>
                    <span className="font-semibold text-sm text-gray-800 block">Generate Audit Log Certificate</span>
                    <span className="text-xs text-gray-500">Attach IP address, timestamp, and signature certificate to final PDF.</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={auditLog}
                    onChange={(e) => setAuditLog(e.target.checked)}
                    className="w-5 h-5 text-blue-600 rounded"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Default Email Invitation Message</label>
                  <textarea
                    rows={3}
                    value={customMsg}
                    onChange={(e) => setCustomMsg(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="border-t pt-4">
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg shadow-sm transition-colors"
                >
                  Save Sansign Settings
                </button>
              </div>
            </form>
          )}

          {/* TAB 5: TEMPLATES */}
          {currentTab === "templates" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-800">Practice Document Templates</h2>
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg shadow-sm flex items-center gap-1.5"
                >
                  <Plus size={14} /> Create Template
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {mockTemplates.map((tmpl) => (
                  <div key={tmpl.id} className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-4 flex flex-col justify-between">
                    <div>
                      <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-bold rounded-full uppercase">
                        {tmpl.category}
                      </span>
                      <h3 className="font-bold text-gray-900 text-base mt-2">{tmpl.name}</h3>
                      <p className="text-xs text-gray-500 mt-1 leading-relaxed">{tmpl.description}</p>
                    </div>

                    <div className="border-t pt-4 flex items-center justify-between text-xs text-gray-400">
                      <span>{tmpl.pages} Pages • {tmpl.fields} Fields</span>
                      <button
                        onClick={() => handleUseTemplate(tmpl.name)}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg transition-colors"
                      >
                        Use Template
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* NEW SIGNATURE REQUEST MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Send size={18} className="text-blue-600" /> Create New E-Signature Request
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateRequest} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Document Title</label>
                <input
                  type="text"
                  required
                  value={modalForm.title}
                  onChange={(e) => setModalForm({ ...modalForm, title: e.target.value })}
                  placeholder="e.g. Year-End Accounts Approval 2026"
                  className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Recipient Client Name</label>
                <input
                  type="text"
                  required
                  value={modalForm.clientName}
                  onChange={(e) => setModalForm({ ...modalForm, clientName: e.target.value })}
                  placeholder="e.g. John Smith"
                  className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Recipient Email Address</label>
                <input
                  type="email"
                  required
                  value={modalForm.clientEmail}
                  onChange={(e) => setModalForm({ ...modalForm, clientEmail: e.target.value })}
                  placeholder="john@smithltd.co.uk"
                  className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Document Source Module</label>
                <select
                  value={modalForm.docType}
                  onChange={(e) => setModalForm({ ...modalForm, docType: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg bg-white outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Accounts Production">Accounts Production</option>
                  <option value="Corporation Tax">Corporation Tax</option>
                  <option value="Onboarding">Onboarding</option>
                  <option value="Custom NDA">Custom NDA</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border rounded-lg text-gray-600 hover:bg-gray-50 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg shadow-sm flex items-center gap-1.5"
                >
                  <Send size={14} /> Send Link Now
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* GLOBAL MEDIA LIBRARY MODAL */}
      <GlobalMediaLibraryModal
        isOpen={isMediaModalOpen}
        onClose={() => setIsMediaModalOpen(false)}
        onSelectFile={handleMediaSelect}
        title="Global Practice Media & Document Library"
      />
    </AppLayout>
  );
}
