import { useState, useRef } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import AppLayout from "../../components/layout/AppLayout";
import { apiRequest, queryClient } from "../../lib/queryClient";
import { useToast } from "../../hooks/useToast";
import {
  ChevronRight,
  Plus,
  Download,
  Upload,
  Edit2,
  RotateCcw,
  AlertCircle,
  Check,
  X,
  RefreshCw,
  Trash2,
  FileText,
  Building2,
  Building,
} from "lucide-react";
import { bookkeepingSidebar, getClientSidebar } from "./sidebar";
import SettingsTabs from "../../components/bookkeeping/SettingsTabs";
import { useAuth } from "../../hooks/useAuth";

export default function InvoiceTemplateSettingsPage() {
  const [matchClient, paramsClient] = useRoute("/bookkeeping/:id/template-settings");
  const [, navigate] = useLocation();
  const clientId = matchClient ? paramsClient.id : "";
  const { toast } = useToast();

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [activeTemplateForAction, setActiveTemplateForAction] = useState<any>(null);

  // Form state for Add/Edit
  const [editingTemplateId, setEditingTemplateId] = useState<number | null>(null);
  const [templateName, setTemplateName] = useState("");
  const [selectedBank, setSelectedBank] = useState("N/A");
  const [isDefault, setIsDefault] = useState(false);

  // Upload file state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Practice Clients Query for company name in breadcrumb & switcher
  const { data: clients = [] } = useQuery({
    queryKey: ["/api/practice/clients"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/practice/clients");
      return res.ok ? res.json() : [];
    },
  });

  const effectiveClientId = clientId || (clients.length > 0 ? String(clients[0].id) : "");
  const activeClient = clients.find((c: any) => String(c.id) === effectiveClientId);

  // Fetch Invoice Templates & Bank Accounts from backend
  const {
    data: templateData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: [`/api/bookkeeping/invoice-templates`, effectiveClientId],
    queryFn: async () => {
      const url = effectiveClientId
        ? `/api/bookkeeping/invoice-templates?clientId=${effectiveClientId}`
        : `/api/bookkeeping/invoice-templates`;
      const res = await apiRequest("GET", url);
      if (!res.ok) throw new Error("Failed to load invoice templates");
      return res.json();
    },
  });

  const templates: any[] = templateData?.templates || [];
  const banks: string[] = templateData?.banks || ["N/A"];

  // Mutation: Save / Edit Template
  const saveTemplateMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiRequest("POST", "/api/bookkeeping/invoice-templates", payload);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to save template");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [`/api/bookkeeping/invoice-templates`, effectiveClientId] });
      toast({ title: "Success", description: data.message });
      closeAddModal();
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  // Mutation: Reset Template to Defaults
  const resetTemplateMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/bookkeeping/invoice-templates/${id}/reset`, {});
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to reset template");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [`/api/bookkeeping/invoice-templates`, effectiveClientId] });
      toast({ title: "Reset Complete", description: data.message });
    },
    onError: (err: any) => {
      toast({ title: "Reset Failed", description: err.message, variant: "destructive" });
    },
  });

  // Mutation: Delete Template
  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/bookkeeping/invoice-templates/${id}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to delete template");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [`/api/bookkeeping/invoice-templates`, effectiveClientId] });
      toast({ title: "Deleted", description: data.message });
    },
    onError: (err: any) => {
      toast({ title: "Delete Failed", description: err.message, variant: "destructive" });
    },
  });

  // Mutation: Upload Customized Template (.docx or .zip)
  const uploadTemplateMutation = useMutation({
    mutationFn: async ({ id, file }: { id: number; file: File }) => {
      const token = useAuth.getState().token;
      const formData = new FormData();
      formData.append("file", file);
      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      const res = await fetch(`/api/bookkeeping/invoice-templates/${id}/upload`, {
        method: "POST",
        headers,
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to upload file");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [`/api/bookkeeping/invoice-templates`, effectiveClientId] });
      toast({ title: "Upload Success", description: data.message });
      closeUploadModal();
    },
    onError: (err: any) => {
      toast({ title: "Upload Failed", description: err.message, variant: "destructive" });
    },
  });

  // Action: Trigger direct ZIP download
  const handleDownloadZip = async (tpl: any) => {
    try {
      const token = useAuth.getState().token;
      const queryParams = new URLSearchParams();
      if (effectiveClientId) queryParams.set("clientId", effectiveClientId);
      if (token) queryParams.set("token", token);
      const queryString = queryParams.toString() ? `?${queryParams.toString()}` : "";
      const url = `/api/bookkeeping/invoice-templates/${tpl.id}/download-zip${queryString}`;

      toast({
        title: "Downloading Template ZIP",
        description: "Preparing Word documents ZIP (Invoice, Credit Note, Dividend, Quotation)...",
      });

      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `Download failed with status ${res.status}`);
      }

      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      const safeName = (tpl.templateName || "Template").replace(/[^a-zA-Z0-9_-]/g, "_");
      a.download = `${safeName}_Templates.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);

      toast({
        title: "Download Started",
        description: `Successfully downloaded ZIP package for "${tpl.templateName}".`,
      });
    } catch (err: any) {
      toast({
        title: "Download Failed",
        description: err.message || "Could not download template ZIP package.",
        variant: "destructive",
      });
    }
  };

  // Open Add Modal
  const handleOpenAdd = () => {
    setEditingTemplateId(null);
    setTemplateName("");
    setSelectedBank("N/A");
    setIsDefault(templates.length === 0);
    setShowAddModal(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (tpl: any) => {
    setEditingTemplateId(tpl.id);
    setTemplateName(tpl.templateName || "");
    setSelectedBank(tpl.bank || "N/A");
    setIsDefault(Boolean(tpl.isDefault));
    setShowAddModal(true);
  };

  // Close Add/Edit Modal
  const closeAddModal = () => {
    setShowAddModal(false);
    setEditingTemplateId(null);
    setTemplateName("");
    setSelectedBank("N/A");
    setIsDefault(false);
  };

  // Open Upload Modal
  const handleOpenUpload = (tpl: any) => {
    setActiveTemplateForAction(tpl);
    setSelectedFile(null);
    setShowUploadModal(true);
  };

  // Close Upload Modal
  const closeUploadModal = () => {
    setShowUploadModal(false);
    setActiveTemplateForAction(null);
    setSelectedFile(null);
  };

  const sidebar = effectiveClientId ? getClientSidebar(effectiveClientId) : bookkeepingSidebar;

  return (
    <AppLayout sidebar={sidebar} module="Bookkeeping">
      <div className="bg-slate-50 min-h-screen pb-16">
        {/* Top Navigation & Client Selector Bar */}
        <div className="bg-white px-6 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-10 shadow-2xs">
          <div className="flex items-center text-xs text-slate-500 gap-2">
            <button
              type="button"
              onClick={() => navigate("/bookkeeping")}
              className="hover:text-purple-600 font-semibold transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Building2 size={13} />
              <span>Bookkeeping</span>
            </button>
            <ChevronRight size={13} className="text-slate-400" />
            <span className="text-slate-700 font-medium">Settings</span>
            <ChevronRight size={13} className="text-slate-400" />
            <span className="font-bold text-purple-700">Invoice Templates (Doc/Pdf)</span>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
              <Building size={14} className="text-purple-600" />
              <span>Client:</span>
            </label>
            <select
              value={effectiveClientId}
              onChange={(e) => navigate(`/bookkeeping/${e.target.value}/template-settings`)}
              className="border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-800 bg-white shadow-2xs focus:ring-2 focus:ring-purple-500 focus:outline-none cursor-pointer"
            >
              {clients.map((c: any) => (
                <option key={c.id} value={c.id}>
                  {c.clientName || c.companyName || `Client #${c.id}`} ({c.companyType || c.clientType || "Business"})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="p-6 max-full mx-auto space-y-6">
          {/* Module Header Card */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-slate-900 tracking-tight">
                  Invoice Templates (Doc/Pdf)
                </h1>
                {activeClient && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
                    {activeClient.clientName || activeClient.companyName}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Customise Word (.docx) and PDF document templates for sales invoices, credit notes, dividends, and quotations with automated branding.
              </p>
            </div>
          </div>

          {/* Settings Tabs Navigation */}
          <SettingsTabs activeTab="templates" clientId={effectiveClientId} />

          {/* Section Header with Registry Title and Action Buttons */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Invoice Templates Registry</h3>
              <p className="text-xs text-slate-500">
                Manage Word docx templates, download ZIP packages, customise styles, and configure default stationery.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => refetch()}
                disabled={isLoading}
                className="px-3 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Refresh templates list"
              >
                <RefreshCw size={13} className={isLoading ? "animate-spin" : ""} />
                <span>Refresh</span>
              </button>
              <button
                type="button"
                onClick={handleOpenAdd}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Plus size={14} />
                <span>Add Invoice Template</span>
              </button>
            </div>
          </div>

          {/* Templates Data Table Card */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold">
                    <th className="py-3.5 px-4">Template Name</th>
                    <th className="py-3.5 px-4 text-center">Primary Default</th>
                    <th className="py-3.5 px-4">Invoice File</th>
                    <th className="py-3.5 px-4">Credit Note File</th>
                    <th className="py-3.5 px-4">Dividend File</th>
                    <th className="py-3.5 px-4">Quotation File</th>
                    <th className="py-3.5 px-4">Updated On</th>
                    <th className="py-3.5 px-4">Bank</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {isLoading ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400">
                        <div className="flex items-center justify-center gap-2">
                          <RefreshCw size={16} className="animate-spin text-purple-600" />
                          <span>Loading invoice templates...</span>
                        </div>
                      </td>
                    </tr>
                  ) : templates.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-500">
                        <div className="max-w-md mx-auto space-y-3">
                          <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto shadow-xs">
                            <FileText size={24} />
                          </div>
                          <div>
                            <p className="font-bold text-slate-800 text-sm">No Invoice Templates Found</p>
                            <p className="text-xs text-slate-500 mt-0.5">
                              Add your first customized template or let SanSuite provision the standard default template package.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={handleOpenAdd}
                            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs shadow-xs inline-flex items-center gap-1.5 transition cursor-pointer"
                          >
                            <Plus size={14} />
                            <span>Create Template</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    templates.map((tpl: any) => (
                      <tr key={tpl.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-slate-800">
                          {tpl.templateName}
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          {tpl.isDefault ? (
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1">
                              <Check size={11} /> Default
                            </span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-slate-700 font-mono text-[11px]">
                          {tpl.invoiceFile || "Invoice.docx"}
                        </td>

                        <td className="py-3.5 px-4 text-slate-700 font-mono text-[11px]">
                          {tpl.creditNoteFile || "CreditNote.docx"}
                        </td>

                        <td className="py-3.5 px-4 text-slate-700 font-mono text-[11px]">
                          {tpl.dividendFile || "Dividend.docx"}
                        </td>

                        <td className="py-3.5 px-4 text-slate-700 font-mono text-[11px]">
                          {tpl.quotationFile || "Quotation.docx"}
                        </td>

                        <td className="py-3.5 px-4 text-slate-600 font-medium">
                          {tpl.updatedOn || "-"}
                        </td>

                        <td className="py-3.5 px-4 text-slate-600 font-medium">
                          {tpl.bank || "N/A"}
                        </td>

                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleDownloadZip(tpl)}
                              className="p-1.5 text-slate-500 hover:text-purple-600 rounded-lg hover:bg-purple-50 transition-colors cursor-pointer"
                              title="Download Word Templates ZIP (.docx)"
                            >
                              <Download size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenUpload(tpl)}
                              className="p-1.5 text-slate-500 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors cursor-pointer"
                              title="Upload Customised Template (.docx or .zip)"
                            >
                              <Upload size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(tpl)}
                              className="p-1.5 text-slate-500 hover:text-purple-600 rounded-lg hover:bg-purple-50 transition-colors cursor-pointer"
                              title="Edit Template Details"
                            >
                              <Edit2 size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm(`Are you sure you want to reset template "${tpl.templateName}" back to standard templates?`)) {
                                  resetTemplateMutation.mutate(tpl.id);
                                }
                              }}
                              className="p-1.5 text-slate-500 hover:text-amber-600 rounded-lg hover:bg-amber-50 transition-colors cursor-pointer"
                              title="Reset to Default Standard Files"
                            >
                              <RotateCcw size={13} />
                            </button>
                            {!tpl.isDefault && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (confirm(`Are you sure you want to delete template "${tpl.templateName}"?`)) {
                                    deleteTemplateMutation.mutate(tpl.id);
                                  }
                                }}
                                className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                                title="Delete Template"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Unified Purple Guidance Banner */}
          <div className="bg-purple-50 border border-purple-200 rounded-2xl p-5 flex items-start gap-3.5 shadow-2xs">
            <div className="p-2 bg-purple-100 text-purple-700 rounded-xl shrink-0 mt-0.5">
              <FileText size={18} />
            </div>
            <div className="text-xs space-y-2">
              <h4 className="font-bold text-purple-950 text-sm">
                Customise Word Document Templates at Ease
              </h4>
              <p className="text-purple-800 leading-relaxed">
                Follow these quick steps to customize your stationery: <strong>1. Add or Select</strong> a template &bull; <strong>2. Download ZIP</strong> to receive editable Word .docx files &bull; <strong>3. Edit in Microsoft Word</strong> (typography, tables, branding, logos, margins) &bull; <strong>4. Upload Template</strong> back to SanSuite.
              </p>
              <div className="bg-white/80 border border-purple-200/70 p-3 rounded-xl flex items-start gap-2 text-purple-900 font-medium">
                <AlertCircle size={14} className="text-purple-600 shrink-0 mt-0.5" />
                <p className="text-[11px] leading-relaxed">
                  <strong>Tag Notice:</strong> Do not remove dynamic merge tags enclosed within &lsquo;&laquo; &raquo;&rsquo; operators (e.g. &laquo;InvoiceNo&raquo;, &laquo;TotalAmount&raquo;, &laquo;ClientName&raquo;) unless you deliberately wish to exclude that dynamic data from printing. You can click <em>Reset to Default</em> at any time to restore the original standard templates.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL 1: ADD / EDIT TEMPLATE */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                  <FileText size={16} />
                </div>
                <h3 className="font-bold text-slate-900 text-sm">
                  {editingTemplateId ? "Edit Invoice Template" : "Add Invoice Template"}
                </h3>
              </div>
              <button
                type="button"
                onClick={closeAddModal}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                saveTemplateMutation.mutate({
                  id: editingTemplateId,
                  clientId: effectiveClientId ? parseInt(effectiveClientId) : null,
                  templateName,
                  bankName: selectedBank,
                  isDefault,
                });
              }}
              className="p-6 space-y-4 text-xs"
            >
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Template Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="e.g. Standard Corporate Template"
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Default Bank Account
                </label>
                <select
                  value={selectedBank}
                  onChange={(e) => setSelectedBank(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:ring-2 focus:ring-purple-500 focus:outline-none bg-white cursor-pointer"
                >
                  <option value="N/A">N/A (No specific bank)</option>
                  {banks
                    .filter((b) => b !== "N/A")
                    .map((bank, idx) => (
                      <option key={idx} value={bank}>
                        {bank}
                      </option>
                    ))}
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  Bank details will be automatically inserted into the &laquo;BankName&raquo; tokens on generated invoice PDFs.
                </p>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="defaultCheckbox"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                />
                <label htmlFor="defaultCheckbox" className="font-semibold text-slate-700 cursor-pointer select-none">
                  Set as default template for all invoices
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={closeAddModal}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saveTemplateMutation.isPending}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs shadow-xs disabled:opacity-50 transition cursor-pointer"
                >
                  {saveTemplateMutation.isPending ? "Saving..." : "Save Template"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: UPLOAD CUSTOMISED TEMPLATE (.DOCX / .ZIP) */}
      {showUploadModal && activeTemplateForAction && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                  <Upload size={16} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Upload Customised Template</h3>
                  <p className="text-[11px] text-slate-500">
                    For &quot;{activeTemplateForAction.templateName}&quot;
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeUploadModal}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <p className="text-slate-600">
                You can upload an individual modified Word document (e.g. <code>Invoice.docx</code>, <code>CreditNote.docx</code>, <code>Dividend.docx</code>, or <code>Quotation.docx</code>) or the entire customized ZIP package.
              </p>

              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-purple-200 hover:border-purple-400 bg-purple-50/30 hover:bg-purple-50/60 rounded-2xl p-6 text-center cursor-pointer transition space-y-2"
              >
                <div className="w-12 h-12 rounded-2xl bg-white text-purple-600 flex items-center justify-center mx-auto shadow-xs border border-purple-100">
                  <FileText size={22} />
                </div>
                <div>
                  <p className="font-bold text-slate-800">
                    {selectedFile ? selectedFile.name : "Click to browse or drag & drop template file here"}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {selectedFile
                      ? `${(selectedFile.size / 1024).toFixed(1)} KB`
                      : "Accepted formats: .docx, .doc, .zip (Max 25MB)"}
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".docx,.doc,.zip"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) setSelectedFile(f);
                  }}
                  className="hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={closeUploadModal}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!selectedFile || uploadTemplateMutation.isPending}
                  onClick={() => {
                    if (selectedFile) {
                      uploadTemplateMutation.mutate({
                        id: activeTemplateForAction.id,
                        file: selectedFile,
                      });
                    }
                  }}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs shadow-xs disabled:opacity-50 transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Upload size={14} />
                  <span>{uploadTemplateMutation.isPending ? "Uploading..." : "Upload File"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
