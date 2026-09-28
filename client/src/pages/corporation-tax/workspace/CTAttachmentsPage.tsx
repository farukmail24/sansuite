import React, { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import CTWorkspaceLayout, { useCTWorkspace } from "./CTWorkspaceLayout";
import { apiRequest } from "../../../lib/queryClient";
import { useToast } from "../../../hooks/useToast";
import {
  FileSpreadsheet, FileText, CheckCircle2, AlertCircle, Upload,
  Download, ExternalLink, Shield, Eye, Paperclip, Trash2, RefreshCw
} from "lucide-react";
import { Link } from "wouter";

export default function CTAttachmentsPage() {
  return (
    <CTWorkspaceLayout activeSection="Attachments & Accounts">
      <CTAttachmentsContent />
    </CTWorkspaceLayout>
  );
}

function CTAttachmentsContent() {
  const {
    clientId,
    client,
    currentReturn,
    openCT600FormModal,
    downloadCT600Pdf,
    downloadComputationPdf,
    downloadIxbrlAccounts,
  } = useCTWorkspace();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isDormantCompany, setIsDormantCompany] = useState(false);
  const [noAccountsReason, setNoAccountsReason] = useState("Dormant");

  // 1. Fetch persistent CT600 return attachments from backend
  const { data: attachmentsData, isLoading, refetch } = useQuery<{
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
    queryKey: [`/api/corporation-tax/${clientId}/returns/${currentReturn?.id}/attachments`],
    queryFn: async () => {
      if (!clientId || !currentReturn?.id) return null;
      const res = await apiRequest("GET", `/api/corporation-tax/${clientId}/returns/${currentReturn.id}/attachments`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!clientId && !!currentReturn?.id,
  });

  // 2. Fetch iXBRL accounts from Accounts Production
  const { data: ixbrlSubmissions = [] } = useQuery<any[]>({
    queryKey: [`/api/accounts-production/${clientId}/ixbrl/submissions`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/accounts-production/${clientId}/ixbrl/submissions`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!clientId,
  });

  const matchingIxbrl = ixbrlSubmissions.find(
    (sub) => sub.periodId === currentReturn?.periodId || sub.status === "Submitted" || sub.status === "Accepted"
  ) || ixbrlSubmissions[0];

  // 3. Upload Attachment Mutation
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("scheduleType", "Supporting Schedule (PDF/XML)");

      const res = await fetch(`/api/corporation-tax/${clientId}/returns/${currentReturn?.id}/attachments/upload`, {
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
        queryKey: [`/api/corporation-tax/${clientId}/returns/${currentReturn?.id}/attachments`],
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

  // 4. Delete Attachment Mutation
  const deleteAttachmentMutation = useMutation({
    mutationFn: async (attachmentId: string) => {
      const res = await apiRequest(
        "DELETE",
        `/api/corporation-tax/${clientId}/returns/${currentReturn?.id}/attachments/${attachmentId}`
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to delete attachment");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: [`/api/corporation-tax/${clientId}/returns/${currentReturn?.id}/attachments`],
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

  // 5. Toggle Accounts Attached Mutation
  const toggleAccountsMutation = useMutation({
    mutationFn: async (attached: boolean) => {
      const res = await apiRequest(
        "POST",
        `/api/corporation-tax/${clientId}/returns/${currentReturn?.id}/attachments/toggle-accounts`,
        { attached }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to update accounts attachment status");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: [`/api/corporation-tax/${clientId}/returns/${currentReturn?.id}/attachments`],
      });
      toast({
        title: data.accountsAttached ? "Accounts Attached" : "Accounts Detached",
        description: data.message,
      });
    },
  });

  const clientName = client?.clientName || "Company";
  const accountsAttached = attachmentsData?.accountsAttached !== false;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <FileSpreadsheet size={16} className="text-indigo-600" />
            CT600 Return Attachments & Statutory Filing Pack
          </h2>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Download the completed final CT600 return (PDF), review computation outputs, and manage attached statutory iXBRL accounts and schedules.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={openCT600FormModal}
            className="px-3 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            title="Open interactive 12-page HMRC CT600 return form"
          >
            <FileText size={12} />
            <span>View CT600 Form</span>
          </button>
          <button
            onClick={() => downloadCT600Pdf()}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            title="Download official final completed CT600 return PDF"
          >
            <Download size={12} />
            <span>Download CT600 (PDF)</span>
          </button>
        </div>
      </div>

      {/* Primary Statutory Submissions & Outputs Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
        <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield size={16} className="text-indigo-600" />
            <h3 className="font-bold text-xs text-slate-900 dark:text-slate-100 uppercase tracking-wider">
              Statutory Return & Filing Documents
            </h3>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => refetch()}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1"
              title="Refresh attachments list"
            >
              <RefreshCw size={13} className={isLoading ? "animate-spin" : ""} />
            </button>
            <span className="text-[11px] text-slate-500 font-medium">
              Accounting Period: {currentReturn?.taxYear || "2026/2027"}
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/50 dark:bg-slate-800/20 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-semibold">
              <tr>
                <th className="py-3 px-4 min-w-[220px]">Document Type</th>
                <th className="py-3 px-4 min-w-[260px]">File Name / Reference</th>
                <th className="py-3 px-4 whitespace-nowrap min-w-[140px]">Status</th>
                <th className="py-3 px-4 text-right whitespace-nowrap min-w-[280px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {/* 1. Official Completed CT600 PDF Row */}
              <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <FileText size={15} className="text-teal-700 shrink-0" />
                  <span>HMRC CT600 Form (PDF)</span>
                </td>
                <td className="py-3 px-4">
                  <span className="font-mono text-slate-700 dark:text-slate-300 font-medium">
                    {attachmentsData?.ct600Pdf?.fileName || `${clientName}_CT600.pdf`}
                  </span>
                  <div className="text-[10px] text-slate-400">Official 12-Page Company Tax Return</div>
                </td>
                <td className="py-3 px-4 whitespace-nowrap">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 whitespace-nowrap">
                    <CheckCircle2 size={12} className="shrink-0" />
                    <span>Completed</span>
                  </span>
                </td>
                <td className="py-3 px-4 text-right whitespace-nowrap">
                  <div className="inline-flex items-center justify-end gap-1.5 flex-nowrap">
                    <button
                      onClick={openCT600FormModal}
                      className="h-7 px-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-md text-[11px] font-medium inline-flex items-center gap-1.5 cursor-pointer transition-colors shrink-0"
                      title="Open interactive 12-page form"
                    >
                      <Eye size={12} />
                      <span>View Form</span>
                    </button>
                    <button
                      onClick={() => downloadCT600Pdf()}
                      className="h-7 px-2.5 bg-[#008080] hover:bg-[#006e6e] text-white rounded-md text-[11px] font-medium inline-flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer shrink-0"
                      title="Download final completed PDF"
                    >
                      <Download size={12} />
                      <span>Download PDF</span>
                    </button>
                  </div>
                </td>
              </tr>

              {/* 2. Statutory Tax Computation PDF Row */}
              <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <FileText size={15} className="text-indigo-600 shrink-0" />
                  <span>Statutory Tax Computation (PDF)</span>
                </td>
                <td className="py-3 px-4">
                  <span className="font-mono text-slate-700 dark:text-slate-300 font-medium">
                    {attachmentsData?.computationPdf?.fileName || `${clientName}_CT_Calc.pdf`}
                  </span>
                  <div className="text-[10px] text-slate-400">Detailed tax computation schedule with capital allowances</div>
                </td>
                <td className="py-3 px-4 whitespace-nowrap">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 whitespace-nowrap">
                    <CheckCircle2 size={12} className="shrink-0" />
                    <span>Ready</span>
                  </span>
                </td>
                <td className="py-3 px-4 text-right whitespace-nowrap">
                  <div className="inline-flex items-center justify-end gap-1.5 flex-nowrap">
                    <Link href={`/corporation-tax/${clientId}/computation`}>
                      <span className="h-7 px-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-md text-[11px] font-medium inline-flex items-center gap-1.5 cursor-pointer transition-colors shrink-0">
                        <Eye size={12} />
                        <span>Review</span>
                      </span>
                    </Link>
                    <button
                      onClick={() => downloadComputationPdf()}
                      className="h-7 px-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-[11px] font-medium inline-flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer shrink-0"
                    >
                      <Download size={12} />
                      <span>Download PDF</span>
                    </button>
                  </div>
                </td>
              </tr>

              {/* 3. Company Accounts (iXBRL) Row */}
              <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <FileSpreadsheet size={15} className="text-emerald-600 shrink-0" />
                  <span>Company Accounts (iXBRL)</span>
                </td>
                <td className="py-3 px-4">
                  <span className="font-mono text-slate-700 dark:text-slate-300 font-medium">
                    {attachmentsData?.ixbrlAccounts?.fileName || `${clientName}_Accounts_iXBRL.html`}
                  </span>
                  <div className="text-[10px] text-slate-400">Micro-entity FRS 105 / FRS 102 1A iXBRL Accounts</div>
                </td>
                <td className="py-3 px-4 whitespace-nowrap">
                  {accountsAttached ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 whitespace-nowrap">
                      <CheckCircle2 size={12} className="shrink-0" />
                      <span>{matchingIxbrl ? "Linked from AP" : "Auto-Prepared"}</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-amber-50 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 whitespace-nowrap">
                      <AlertCircle size={12} className="shrink-0" />
                      <span>Detached / Exempt</span>
                    </span>
                  )}
                </td>
                <td className="py-3 px-4 text-right whitespace-nowrap">
                  <div className="inline-flex items-center justify-end gap-1.5 flex-nowrap">
                    <Link href={`/accounts-production/${clientId}/ixbrl-filing`}>
                      <span className="h-7 px-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-md text-[11px] font-medium inline-flex items-center gap-1.5 cursor-pointer transition-colors shrink-0">
                        <ExternalLink size={12} />
                        <span>View in AP</span>
                      </span>
                    </Link>
                    <button
                      onClick={() => downloadIxbrlAccounts()}
                      className="h-7 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-[11px] font-medium inline-flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer shrink-0"
                    >
                      <Download size={12} />
                      <span>Download iXBRL</span>
                    </button>
                    {accountsAttached ? (
                      <button
                        onClick={() => {
                          if (confirm("Are you sure you want to detach statutory accounts from this CT600 return? You will need to declare an exception reason under HMRC rules.")) {
                            toggleAccountsMutation.mutate(false);
                          }
                        }}
                        disabled={toggleAccountsMutation.isPending}
                        className="h-7 px-2.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900 rounded-md text-[11px] font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                        title="Detach statutory accounts"
                      >
                        <Trash2 size={12} />
                        <span>Detach</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => toggleAccountsMutation.mutate(true)}
                        disabled={toggleAccountsMutation.isPending}
                        className="h-7 px-2.5 bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-900 rounded-md text-[11px] font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                        title="Re-attach statutory accounts"
                      >
                        <Paperclip size={12} />
                        <span>Attach</span>
                      </button>
                    )}
                  </div>
                </td>
              </tr>

              {/* Custom Uploaded Attachments / Schedules with full Delete option */}
              {(attachmentsData?.schedules || []).map((att) => (
                <tr key={att.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <Paperclip size={15} className="text-amber-600 shrink-0" />
                    <span>{att.type}</span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-mono text-slate-700 dark:text-slate-300 font-medium">{att.name}</span>
                    <div className="text-[10px] text-slate-400">
                      Size: {att.sizeFormatted} • Uploaded {new Date(att.uploadedAt).toLocaleDateString("en-GB")}
                    </div>
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-blue-50 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60 whitespace-nowrap">
                      <Paperclip size={12} className="shrink-0" />
                      <span>Attached</span>
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    <div className="inline-flex items-center justify-end gap-1.5 flex-nowrap">
                      <a
                        href={`/api/corporation-tax/${clientId}/returns/${currentReturn?.id}/attachments/download/${att.storedFilename}`}
                        download={att.name}
                        className="h-7 px-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-md text-[11px] font-medium inline-flex items-center gap-1.5 cursor-pointer transition-colors shrink-0"
                        title="Download schedule"
                      >
                        <Download size={12} />
                        <span>Download</span>
                      </a>
                      <button
                        onClick={() => {
                          if (confirm(`Are you sure you want to permanently delete "${att.name}"?`)) {
                            deleteAttachmentMutation.mutate(att.id);
                          }
                        }}
                        disabled={deleteAttachmentMutation.isPending}
                        className="h-7 px-2.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900 rounded-md text-[11px] font-medium inline-flex items-center gap-1.5 cursor-pointer transition-colors shrink-0"
                        title="Permanently delete this attachment"
                      >
                        <Trash2 size={12} />
                        <span>Delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Additional Supporting Schedules Upload Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
          <div className="flex items-center gap-2">
            <Paperclip size={16} className="text-indigo-600" />
            <h3 className="font-bold text-xs text-slate-900 dark:text-slate-100 uppercase tracking-wider">
              Attach Additional Supporting Schedules (Optional)
            </h3>
          </div>
          <label className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs">
            <Upload size={12} />
            <span>{uploadMutation.isPending ? "Uploading..." : "Upload File (PDF / XML)"}</span>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.xml,.html,.ixbrl,.xlsx,.csv"
              onChange={(e) => {
                const files = e.target.files;
                if (files && files.length > 0) {
                  uploadMutation.mutate(files[0]);
                }
              }}
              disabled={uploadMutation.isPending}
              className="hidden"
            />
          </label>
        </div>
        <p className="text-xs text-slate-500">
          Upload any non-standard disclosures, R&D technical narratives, patent box elections, or overseas tax deduction certificates required by HMRC. All attached schedules can be downloaded or deleted at any time.
        </p>
      </div>

      {/* Dormant Company Exception */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
          <h3 className="font-bold text-xs text-slate-900 dark:text-slate-100 uppercase tracking-wider">
            Dormant Company Exception
          </h3>
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={isDormantCompany || !accountsAttached}
              onChange={(e) => {
                const checked = e.target.checked;
                setIsDormantCompany(checked);
                if (checked && accountsAttached) {
                  toggleAccountsMutation.mutate(false);
                } else if (!checked && !accountsAttached) {
                  toggleAccountsMutation.mutate(true);
                }
              }}
              className="rounded border-slate-300"
            />
            Dormant Company Return (No Accounts Required)
          </label>
        </div>

        {(isDormantCompany || !accountsAttached) && (
          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-3 text-xs">
            <label className="font-medium text-slate-700 dark:text-slate-300 block">Reason No Accounts are Attached</label>
            <select
              value={noAccountsReason}
              onChange={(e) => setNoAccountsReason(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
            >
              <option value="Dormant">Company is dormant (no trading or business transactions)</option>
              <option value="FiledSeparately">Accounts already submitted to HMRC separately</option>
              <option value="NotRequired">Company is exempt from filing accounts with HMRC</option>
            </select>
            <p className="text-[10px] text-slate-400">
              This reason will be inserted into the HMRC XML Body tag (Box 95/96) to prevent rejection code 3001.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}


