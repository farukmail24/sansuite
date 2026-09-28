import React, { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  X, Paperclip, FileCode, FileText, Download, Eye,
  Upload, CheckCircle2, AlertCircle, ExternalLink, Calendar, Trash2
} from "lucide-react";
import { apiRequest } from "../../../lib/queryClient";
import { useToast } from "../../../hooks/useToast";
import { downloadAuthorizedFile } from "../../../lib/authDownload";

interface CTAttachmentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
  client: any;
  currentReturn: any;
  returns: any[];
  onSelectReturn?: (id: number) => void;
  onOpenCT600Form?: () => void;
}

export default function CTAttachmentsModal({
  isOpen,
  onClose,
  clientId,
  client,
  currentReturn,
  returns,
  onSelectReturn,
  onOpenCT600Form,
}: CTAttachmentsModalProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeReturnId, setActiveReturnId] = useState<number | null>(
    currentReturn?.id || (returns.length > 0 ? returns[0].id : null)
  );

  const [previewFile, setPreviewFile] = useState<{ name: string; url: string; type: string } | null>(null);

  const selectedRet = returns.find((r) => r.id === (activeReturnId || currentReturn?.id)) || currentReturn;

  // Persistent attachments from backend
  const { data: attachmentsData, isLoading } = useQuery<{
    returnId: number;
    accountsAttached: boolean;
    ct600Pdf: { fileName: string; status: string; description: string };
    computationPdf: { fileName: string; status: string; description: string };
    ixbrlAccounts: { fileName: string; status: string; description: string; attached: boolean };
    schedules: Array<{
      id: string;
      name: string;
      storedFilename: string;
      type: string;
      sizeFormatted: string;
      sizeBytes: number;
      mimeType: string;
      uploadedAt: string;
    }>;
  }>({
    queryKey: [`/api/corporation-tax/${clientId}/returns/${selectedRet?.id}/attachments`],
    queryFn: async () => {
      if (!clientId || !selectedRet?.id) return null;
      const res = await apiRequest("GET", `/api/corporation-tax/${clientId}/returns/${selectedRet.id}/attachments`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: isOpen && !!clientId && !!selectedRet?.id,
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("scheduleType", "Supporting Schedule (PDF/XML)");

      const res = await fetch(`/api/corporation-tax/${clientId}/returns/${selectedRet?.id}/attachments/upload`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to upload attachment");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: [`/api/corporation-tax/${clientId}/returns/${selectedRet?.id}/attachments`],
      });
      toast({
        title: "Attachment Uploaded",
        description: `${data.attachment?.name || "File"} successfully linked to CT600 return.`,
      });
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    onError: (err: any) => {
      toast({
        title: "Upload Failed",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const deleteAttachmentMutation = useMutation({
    mutationFn: async (attachmentId: string) => {
      const res = await apiRequest(
        "DELETE",
        `/api/corporation-tax/${clientId}/returns/${selectedRet?.id}/attachments/${attachmentId}`
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to delete attachment");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: [`/api/corporation-tax/${clientId}/returns/${selectedRet?.id}/attachments`],
      });
      toast({
        title: "Attachment Deleted",
        description: data.message || "Attachment successfully deleted.",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Delete Failed",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  if (!isOpen) return null;

  const startDate = selectedRet?.accountingPeriodStart ? new Date(selectedRet.accountingPeriodStart) : new Date();
  const endDate = selectedRet?.accountingPeriodEnd ? new Date(selectedRet.accountingPeriodEnd) : new Date();
  const periodLabel = `${startDate.toLocaleDateString("en-GB")} - ${endDate.toLocaleDateString("en-GB")}`;

  const ixbrlAccountsUrl = `/api/corporation-tax/${clientId}/returns/${selectedRet?.id}/ixbrl-accounts`;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    uploadMutation.mutate(files[0]);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
      <div className="relative bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-4xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 rounded-t-xl">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-teal-100 dark:bg-teal-950/60 text-teal-600 flex items-center justify-center font-bold">
              <Paperclip size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                CT600 Return Attachments
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Statutory HMRC iXBRL Accounts & Supporting Documentation
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Accounting Period Tabs (Capium Style) */}
        {returns.length > 0 && (
          <div className="bg-slate-100/70 dark:bg-slate-950/80 px-6 pt-2 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2 overflow-x-auto">
            {returns.map((ret) => {
              const rStart = new Date(ret.accountingPeriodStart).toLocaleDateString("en-GB");
              const rEnd = new Date(ret.accountingPeriodEnd).toLocaleDateString("en-GB");
              const isSelected = ret.id === (activeReturnId || currentReturn?.id);
              return (
                <button
                  key={ret.id}
                  onClick={() => {
                    setActiveReturnId(ret.id);
                    if (onSelectReturn) onSelectReturn(ret.id);
                  }}
                  className={`px-4 py-2 text-xs font-semibold rounded-t-lg transition-colors border-t border-x cursor-pointer ${
                    isSelected
                      ? "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-indigo-600 dark:text-indigo-400 border-b-transparent -mb-[1px]"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 border-transparent hover:bg-slate-200/50"
                  }`}
                >
                  {rStart} - {rEnd}
                </button>
              );
            })}
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Statutory HMRC Compliance Note */}
          <div className="bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 rounded-lg p-3 text-xs text-indigo-900 dark:text-indigo-300 flex items-start gap-2.5">
            <CheckCircle2 size={16} className="text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">HMRC Statutory Filing Requirement:</span> UK Corporation Tax CT600 submissions require tagged Inline XBRL (iXBRL) accounts linked to the company's accounting period. Below is the active iXBRL accounts file associated with this return.
            </div>
          </div>

          {/* Attachments Table (Matches Capium Layout) */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-semibold">
                <tr>
                  <th className="py-3 px-4 min-w-[200px]">File Type</th>
                  <th className="py-3 px-4 min-w-[220px]">File Name</th>
                  <th className="py-3 px-4 whitespace-nowrap min-w-[130px]">Status</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap min-w-[220px]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {/* 1. Company Accounts (iXBRL) Row */}
                <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <FileCode size={15} className="text-indigo-600 shrink-0" />
                    <span>Company Accounts (iXBRL)</span>
                  </td>
                  <td className="py-3 px-4">
                    <button
                      onClick={() =>
                        setPreviewFile({
                          name: "LnkMicroCo1.html",
                          url: ixbrlAccountsUrl,
                          type: "ixbrl",
                        })
                      }
                      className="text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 font-mono font-medium underline cursor-pointer inline-flex items-center gap-1"
                    >
                      <span>LnkMicroCo1.html</span>
                      <ExternalLink size={11} />
                    </button>
                    <div className="text-[10px] text-slate-400">Micro-entity FRS 105 iXBRL Accounts</div>
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 whitespace-nowrap">
                      <CheckCircle2 size={12} className="shrink-0" />
                      <span>HMRC Ready</span>
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    <div className="inline-flex items-center justify-end gap-1.5 flex-nowrap">
                      <button
                        onClick={() =>
                          setPreviewFile({
                            name: "LnkMicroCo1.html",
                            url: ixbrlAccountsUrl,
                            type: "ixbrl",
                          })
                        }
                        className="h-7 px-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-md text-[11px] font-medium inline-flex items-center gap-1 cursor-pointer transition-colors shrink-0"
                      >
                        <Eye size={12} />
                        <span>Preview</span>
                      </button>
                      <button
                        onClick={async () => {
                          const safeName = (client?.clientName || "Company").replace(/[^a-zA-Z0-9_-]/g, "_");
                          try {
                            await downloadAuthorizedFile(ixbrlAccountsUrl, `${safeName}_Accounts_iXBRL.html`);
                            toast({ title: "Downloaded", description: "iXBRL accounts downloaded successfully." });
                          } catch (err: any) {
                            toast({ title: "Download Failed", description: err.message, variant: "destructive" });
                          }
                        }}
                        className="h-7 px-2.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 rounded-md text-[11px] font-medium inline-flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                      >
                        <Download size={12} />
                        <span>Download</span>
                      </button>
                    </div>
                  </td>
                </tr>

                {/* 2. Official CT600 Return PDF Row */}
                <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <FileText size={15} className="text-[#007077] shrink-0" />
                    <span>HMRC CT600 Form (PDF)</span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-mono text-slate-700 dark:text-slate-300">
                      {client?.clientName?.replace(/\s+/g, "_") || "Company"}_CT600.pdf
                    </span>
                    <div className="text-[10px] text-slate-400">Official 12-Page Company Tax Return</div>
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 whitespace-nowrap">
                      <CheckCircle2 size={12} className="shrink-0" />
                      <span>HMRC Official</span>
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    <div className="inline-flex items-center justify-end gap-1.5 flex-nowrap">
                      {onOpenCT600Form && (
                        <button
                          onClick={onOpenCT600Form}
                          className="h-7 px-2.5 bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/60 dark:text-teal-300 text-teal-800 rounded-md text-[11px] font-medium inline-flex items-center gap-1 cursor-pointer transition-colors shrink-0"
                          title="Open interactive 12-page CT600 return form"
                        >
                          <Eye size={12} />
                          <span>View Form</span>
                        </button>
                      )}
                      <button
                        onClick={async () => {
                          const safeName = (client?.clientName || "Company").replace(/[^a-zA-Z0-9_-]/g, "_");
                          const niceName = client?.clientName || safeName;
                          try {
                            await downloadAuthorizedFile(`/api/corporation-tax/${clientId}/returns/${selectedRet?.id}/ct600-pdf`, `${niceName}_CT600.pdf`);
                            toast({ title: "Downloaded", description: `${niceName}_CT600.pdf downloaded successfully.` });
                          } catch (err: any) {
                            toast({ title: "Download Failed", description: err.message, variant: "destructive" });
                          }
                        }}
                        className="h-7 px-2.5 bg-[#007077] hover:bg-[#005a60] text-white rounded-md text-[11px] font-medium inline-flex items-center gap-1 shadow-xs transition-colors cursor-pointer shrink-0"
                      >
                        <Download size={12} />
                        <span>Download PDF</span>
                      </button>
                    </div>
                  </td>
                </tr>

                {/* 3. Statutory Tax Computation PDF Row */}
                <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <FileText size={15} className="text-emerald-600 shrink-0" />
                    <span>Statutory Tax Computation (PDF)</span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-mono text-slate-700 dark:text-slate-300">
                      {client?.clientName?.replace(/\s+/g, "_") || "Company"}_CT_Calc.pdf
                    </span>
                    <div className="text-[10px] text-slate-400">Statutory 2-Page Corporation Tax Calculation</div>
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 whitespace-nowrap">
                      <CheckCircle2 size={12} className="shrink-0" />
                      <span>Generated</span>
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    <div className="inline-flex items-center justify-end gap-1.5 flex-nowrap">
                      <button
                        onClick={async () => {
                          const safeName = (client?.clientName || "Company").replace(/[^a-zA-Z0-9_-]/g, "_");
                          try {
                            await downloadAuthorizedFile(`/api/corporation-tax/${clientId}/returns/${selectedRet?.id}/computation-pdf`, `${safeName}_CT_Calc.pdf`);
                            toast({ title: "Downloaded", description: `${safeName}_CT_Calc.pdf downloaded successfully.` });
                          } catch (err: any) {
                            toast({ title: "Download Failed", description: err.message, variant: "destructive" });
                          }
                        }}
                        className="h-7 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-[11px] font-medium inline-flex items-center gap-1 shadow-xs transition-colors cursor-pointer shrink-0"
                      >
                        <Download size={12} />
                        <span>Download PDF</span>
                      </button>
                    </div>
                  </td>
                </tr>

                {/* 4. Tax Computation Cover Letter Row */}
                <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <FileText size={15} className="text-slate-600 shrink-0" />
                    <span>Client Tax Notice &amp; Cover Letter</span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-mono text-slate-700 dark:text-slate-300">
                      {client?.clientName?.replace(/\s+/g, "_") || "Client"}_CT_Calc.doc
                    </span>
                    <div className="text-[10px] text-slate-400">Word Document Tax Summary &amp; Letter</div>
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700 whitespace-nowrap">
                      <span>Word Doc</span>
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    <div className="inline-flex items-center justify-end gap-1.5 flex-nowrap">
                      <button
                        onClick={async () => {
                          const safeName = (client?.clientName || "Company").replace(/[^a-zA-Z0-9_-]/g, "_");
                          try {
                            await downloadAuthorizedFile(`/api/corporation-tax/${clientId}/returns/${selectedRet?.id}/tax-summary-doc`, `${safeName}_CT_Calc.doc`);
                            toast({ title: "Downloaded", description: `${safeName}_CT_Calc.doc downloaded successfully.` });
                          } catch (err: any) {
                            toast({ title: "Download Failed", description: err.message, variant: "destructive" });
                          }
                        }}
                        className="h-7 px-2.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-md text-[11px] font-medium inline-flex items-center gap-1 shadow-xs transition-colors cursor-pointer shrink-0"
                      >
                        <Download size={12} />
                        <span>Download .doc</span>
                      </button>
                    </div>
                  </td>
                </tr>

                {/* Custom Uploaded Attachments / Schedules */}
                {(attachmentsData?.schedules || []).map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                      <Paperclip size={15} className="text-amber-600" />
                      <span>{item.type}</span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-700 dark:text-slate-300">
                      {item.name}
                      <span className="text-[10px] text-slate-400 ml-2">({item.sizeFormatted})</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300">
                        Attached
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right space-x-2">
                      <a
                        href={`/api/corporation-tax/${clientId}/returns/${selectedRet?.id}/attachments/download/${item.storedFilename}`}
                        download={item.name}
                        className="px-2 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded text-[11px] font-medium inline-flex items-center gap-1 cursor-pointer transition-colors"
                        title="Download schedule"
                      >
                        <Download size={11} />
                        <span>Download</span>
                      </a>
                      <button
                        onClick={() => {
                          if (confirm(`Permanently delete attachment "${item.name}"?`)) {
                            deleteAttachmentMutation.mutate(item.id);
                          }
                        }}
                        disabled={deleteAttachmentMutation.isPending}
                        className="px-2 py-1 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900 rounded text-[11px] font-medium inline-flex items-center gap-1 cursor-pointer transition-colors"
                        title="Delete attachment"
                      >
                        <Trash2 size={11} />
                        <span>Delete</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Upload Additional Attachment Box */}
          <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-lg p-5 text-center space-y-2 hover:border-indigo-400 dark:hover:border-indigo-600 transition-colors">
            <Upload size={24} className="mx-auto text-slate-400" />
            <div>
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                Upload Supplementary CT600 Schedule or Document
              </p>
              <p className="text-[11px] text-slate-400">
                Supports PDF, XML, or iXBRL (e.g. Group Relief, Loss Carryback Claims, R&D justification)
              </p>
            </div>
            <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold cursor-pointer transition-colors">
              <Upload size={13} />
              <span>{uploadMutation.isPending ? "Uploading..." : "Select File to Attach"}</span>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".pdf,.html,.htm,.xhtml,.xml,.doc,.docx,.xlsx,.csv"
                onChange={handleFileUpload}
                disabled={uploadMutation.isPending}
              />
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 rounded-b-xl">
          <div className="text-xs text-slate-500">
            Selected Period: <span className="font-semibold text-slate-700 dark:text-slate-300">{periodLabel}</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg text-xs font-semibold cursor-pointer"
          >
            Close
          </button>
        </div>

        {/* In-Modal iXBRL Accounts Preview Sub-Modal */}
        {previewFile && (
          <div className="fixed inset-0 z-60 bg-black/80 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-4xl h-[85vh] flex flex-col border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
                <div className="flex items-center gap-2">
                  <FileCode size={16} className="text-indigo-600" />
                  <span className="font-bold text-xs text-slate-800 dark:text-slate-200">
                    Preview: {previewFile.name} (HMRC Statutory iXBRL Accounts)
                  </span>
                </div>
                <button
                  onClick={() => setPreviewFile(null)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="flex-1 bg-white">
                <iframe
                  src={previewFile.url}
                  title="iXBRL Preview"
                  className="w-full h-full border-0"
                />
              </div>

              <div className="flex items-center justify-between px-5 py-2.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs">
                <span className="text-slate-500">
                  Tags: Companies House Registered No. • Director Signoff • Micro-Entity Balance Sheet
                </span>
                <button
                  onClick={() => setPreviewFile(null)}
                  className="px-3 py-1 bg-slate-200 hover:bg-slate-300 rounded text-slate-700 font-semibold cursor-pointer"
                >
                  Close Preview
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
