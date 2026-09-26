import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import CTWorkspaceLayout, { useCTWorkspace } from "./CTWorkspaceLayout";
import { apiRequest } from "../../../lib/queryClient";
import { useToast } from "../../../hooks/useToast";
import SendToeSignModal from "../../../components/esign/SendToeSignModal";
import { generatePdfCertificate } from "../../../lib/pdfCertificateGenerator";
import {
  FileSignature, Send, Download, RefreshCw, Copy, CheckCircle2,
  Clock, XCircle, Eye, Trash2, ShieldCheck, ExternalLink,
  Calendar, User, FileText, Check, AlertCircle, X, ArrowRight, Mail
} from "lucide-react";

export default function CTeSignPage() {
  return (
    <CTWorkspaceLayout activeSection="eSign Approval">
      <CTeSignContent />
    </CTWorkspaceLayout>
  );
}

function CTeSignContent() {
  const { clientId, client, currentReturn, refetchReturns } = useCTWorkspace();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [showeSignModal, setShoweSignModal] = useState(false);
  const [selectedAuditDoc, setSelectedAuditDoc] = useState<any | null>(null);
  const [auditLogsLoading, setAuditLogsLoading] = useState(false);
  const [auditLogsData, setAuditLogsData] = useState<any[]>([]);

  // Quick Dispatch form state
  const [directorName, setDirectorName] = useState("");
  const [customDirectorName, setCustomDirectorName] = useState("");
  const [directorEmail, setDirectorEmail] = useState("");
  const [copiedId, setCopiedId] = useState<number | null>(null);

  // Fetch Company Officers / Directors
  const { data: directors = [] } = useQuery<any[]>({
    queryKey: [`/api/corporation-tax/${clientId}/directors`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/corporation-tax/${clientId}/directors`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!clientId,
  });

  // Fetch Capisign Documents (Matches Accounts Production architecture)
  const { data: alleSignData, isLoading, refetch: refetcheSignDocs } = useQuery<any>({
    queryKey: ["/api/esign/documents"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/esign/documents");
      if (!res.ok) return { documents: [] };
      return res.json();
    },
  });

  const allDocs: any[] = Array.isArray(alleSignData?.documents)
    ? alleSignData.documents
    : (Array.isArray(alleSignData) ? alleSignData : []);

  const clientDocs = allDocs.filter(
    (d: any) =>
      d.clientId === parseInt(clientId || "0") &&
      (d.sourceModule === "Corporation Tax" || (d.title && d.title.toLowerCase().includes("ct600")))
  );

  const signedCount = clientDocs.filter((d: any) => d.status === "Signed").length;
  const awaitingCount = clientDocs.filter(
    (d: any) => d.status === "AwaitingApproval" || d.status === "Awaiting"
  ).length;
  const latestSignedDoc = clientDocs.find((d: any) => d.status === "Signed");

  useEffect(() => {
    if (directors.length > 0 && !directorName) {
      const signatory = directors.find((d: any) => d.isSignatory || d.isSignatoryOnAccounts) || directors[0];
      const name = signatory?.name || signatory?.officerName || "";
      if (name) {
        setDirectorName(name);
      }
    }
    if (client?.email && !directorEmail) {
      setDirectorEmail(client.email);
    }
  }, [directors, client, directorName, directorEmail]);

  const effectiveDirectorName = directorName === "__custom__"
    ? customDirectorName.trim()
    : directorName.trim();

  // Open audit trail modal and fetch full document logs
  const handleOpenAuditModal = async (doc: any) => {
    setSelectedAuditDoc(doc);
    setAuditLogsLoading(true);
    try {
      const res = await apiRequest("GET", `/api/esign/documents/${doc.id}`);
      if (res.ok) {
        const fullDoc = await res.json();
        setAuditLogsData(fullDoc.auditLogs || []);
      }
    } catch {
      toast({
        title: "Error",
        description: "Failed to load audit history for this document.",
        variant: "destructive",
      });
    } finally {
      setAuditLogsLoading(false);
    }
  };

  // Void / Delete signature request
  const handleDeleteDoc = async (docId: number) => {
    if (!window.confirm("Are you sure you want to void / delete this signature request? This action cannot be undone.")) {
      return;
    }
    try {
      const res = await apiRequest("DELETE", `/api/esign/documents/${docId}`);
      if (!res.ok) throw new Error("Failed to delete signature request");
      toast({
        title: "Deleted",
        description: "Signature request successfully deleted.",
      });
      await refetcheSignDocs();
      await refetchReturns();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to delete document",
        variant: "destructive",
      });
    }
  };

  // Direct quick dispatch mutation
  const quickDispatchMutation = useMutation({
    mutationFn: async () => {
      if (!currentReturn?.id) return;
      const finalName = effectiveDirectorName || client?.contactPerson || client?.clientName || "Director";
      const res = await apiRequest("POST", `/api/corporation-tax/${clientId}/returns/${currentReturn.id}/send-to-capisign`, {
        directorName: finalName,
        directorEmail: directorEmail.trim() || client?.email || "",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to dispatch eSign document.");
      }
      return await res.json();
    },
    onSuccess: async (data: any) => {
      await refetchReturns();
      await refetcheSignDocs();
      queryClient.invalidateQueries({ queryKey: ["/api/esign/documents"] });
      const fullUrl = data?.signUrl ? `${window.location.origin}${data.signUrl}` : "";
      toast({
        title: "CT600 Dispatched to eSign Portal",
        description: fullUrl ? `Digital signing link generated: ${fullUrl}` : "Digital signing document sent to director.",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Dispatch Failed",
        description: err.message || "Failed to dispatch eSign document.",
        variant: "destructive",
      });
    },
  });

  // Manual Paper Signature Mutation
  const markSignedMutation = useMutation({
    mutationFn: async () => {
      if (!currentReturn?.id) return;
      const finalName = effectiveDirectorName || client?.contactPerson || client?.clientName || "Director";
      const res = await apiRequest("POST", `/api/corporation-tax/${clientId}/returns/${currentReturn.id}/mark-signed`, {
        signeeName: finalName || "Director (Manual Paper Approval)",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to mark as signed.");
      }
      return await res.json();
    },
    onSuccess: async () => {
      await refetchReturns();
      await refetcheSignDocs();
      toast({
        title: "CT600 Marked as Approved & Signed",
        description: "Status advanced to Signed. Return is ready for HMRC gateway submission.",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Update Failed",
        description: err.message || "Failed to update return status.",
        variant: "destructive",
      });
    },
  });

  if (!currentReturn) return null;

  const isReturnSigned = currentReturn.status === "Signed" || currentReturn.status === "Accepted" || signedCount > 0;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div>
          <h2 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <FileSignature size={16} className="text-purple-600" />
            eSign Portal (CT600 Corporation Tax Approval)
          </h2>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            UK Electronic Communications Act 2000 &amp; eIDAS compliant statutory sign-off by company directors.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShoweSignModal(true)}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium text-xs flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
          >
            <Send size={13} /> Dispatch CT600 to eSign
          </button>

          {isReturnSigned && (
            <Link
              href={`/corporation-tax/${clientId}/submit`}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <span>Proceed to Step 9: HMRC Submit</span>
              <ArrowRight size={13} />
            </Link>
          )}
        </div>
      </div>

      {/* KPI Overview Summary Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 flex items-center justify-between">
          <div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-medium">Total Dispatched</span>
            <span className="text-lg font-bold text-slate-900 dark:text-slate-100">{clientDocs.length}</span>
          </div>
          <div className="w-8 h-8 rounded-lg bg-slate-200/70 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300">
            <FileText size={16} />
          </div>
        </div>

        <div className="bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/60 rounded-xl p-3.5 flex items-center justify-between">
          <div>
            <span className="text-[11px] text-emerald-700 dark:text-emerald-400 block font-medium">Signed &amp; Approved</span>
            <span className="text-lg font-bold text-emerald-800 dark:text-emerald-300">{signedCount}</span>
          </div>
          <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 size={16} />
          </div>
        </div>

        <div className="bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/60 rounded-xl p-3.5 flex items-center justify-between">
          <div>
            <span className="text-[11px] text-amber-700 dark:text-amber-400 block font-medium">Awaiting Signature</span>
            <span className="text-lg font-bold text-amber-800 dark:text-amber-300">{awaitingCount}</span>
          </div>
          <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center text-amber-600 dark:text-amber-400">
            <Clock size={16} />
          </div>
        </div>
      </div>

      {/* Executive Statutory Approval Milestone Banner (When a CT600 document is Signed) */}
      {(latestSignedDoc || currentReturn.status === "Signed") && (
        <div className="bg-emerald-50/90 dark:bg-emerald-950/30 border-2 border-emerald-300 dark:border-emerald-800 rounded-xl p-5 shadow-xs">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0 mt-0.5">
                <CheckCircle2 size={22} />
              </div>
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 uppercase tracking-wide">
                  <ShieldCheck size={12} /> Statutory Sign-Off Complete
                </div>
                <h3 className="text-sm font-bold text-emerald-950 dark:text-emerald-100">
                  CT600 Return &amp; Corporation Tax Computation Legally Approved
                </h3>
                <p className="text-xs text-emerald-800 dark:text-emerald-300 leading-relaxed">
                  The statutory tax return for <strong>{client?.clientName || "the company"}</strong> (Accounting Period: {currentReturn.accountingPeriodStart ? new Date(currentReturn.accountingPeriodStart).toLocaleDateString("en-GB") : ""} - {currentReturn.accountingPeriodEnd ? new Date(currentReturn.accountingPeriodEnd).toLocaleDateString("en-GB") : ""}) has been digitally signed and validated in compliance with <strong>Taxes Management Act 1970</strong> and <strong>UK Companies Act 2006</strong>.
                </p>
                <div className="flex flex-wrap items-center gap-3 text-[11px] text-emerald-700 dark:text-emerald-400 pt-1 font-mono">
                  <span>Signatory: <strong>{latestSignedDoc?.signerName || directorName || "Director"}</strong></span>
                  <span>Email: {latestSignedDoc?.signerEmail || directorEmail || client?.email}</span>
                  <span>Role: {latestSignedDoc?.signerRole || "Director"}</span>
                  <span>Date: {new Date(latestSignedDoc?.completedAt || latestSignedDoc?.createdAt || Date.now()).toLocaleString("en-GB")}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0 self-end md:self-center">
              {latestSignedDoc && (
                <button
                  type="button"
                  onClick={() => {
                    generatePdfCertificate({
                      documentId: latestSignedDoc.id,
                      title: latestSignedDoc.title,
                      sourceModule: "Corporation Tax",
                      createdAt: latestSignedDoc.createdAt,
                      completedAt: latestSignedDoc.completedAt || new Date(),
                      signerName: latestSignedDoc.signerName || client?.clientName || "Director",
                      signerEmail: latestSignedDoc.signerEmail || client?.email || "",
                    });
                  }}
                  className="px-3 py-1.5 bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 rounded-lg text-xs font-semibold hover:bg-emerald-50 dark:hover:bg-emerald-900/40 flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                >
                  <Download size={12} /> Download Certificate
                </button>
              )}

              <Link
                href={`/corporation-tax/${clientId}/submit`}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
              >
                <span>Continue to Step 9: HMRC Gateway &rarr;</span>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Signature Requests History Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200">
            Signature Request History &amp; Audit Trail ({clientDocs.length})
          </h3>
          <button
            type="button"
            onClick={() => {
              refetcheSignDocs();
              refetchReturns();
            }}
            className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 font-medium cursor-pointer"
          >
            <RefreshCw size={11} className={isLoading ? "animate-spin text-purple-600" : ""} /> Refresh
          </button>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
            <RefreshCw size={14} className="animate-spin text-purple-600" />
            <span>Loading signature documents...</span>
          </div>
        ) : clientDocs.length === 0 ? (
          <div className="p-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl space-y-2">
            <p className="text-xs text-slate-400">No signature requests generated yet for this CT600 return.</p>
            <button
              onClick={() => setShoweSignModal(true)}
              className="text-xs text-purple-600 hover:underline font-semibold cursor-pointer"
            >
              Click here to dispatch CT600 Tax Approval request
            </button>
          </div>
        ) : (
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden text-xs">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                  <th className="py-2.5 px-4 text-left">Document &amp; Scope</th>
                  <th className="py-2.5 px-4 text-left">Signatory &amp; Role</th>
                  <th className="py-2.5 px-4 text-left">Status</th>
                  <th className="py-2.5 px-4 text-left">Dispatched</th>
                  <th className="py-2.5 px-4 text-left">Completed At</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {clientDocs.map((doc: any) => {
                  const isSigned = doc.status === "Signed";
                  const isAwaiting = doc.status === "AwaitingApproval" || doc.status === "Awaiting";
                  const isDeclined = doc.status === "Declined";

                  return (
                    <tr key={doc.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                          <FileText size={13} className="text-purple-600 shrink-0" />
                          <span>{doc.title}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">
                          ID: #{doc.id} • {doc.sourceModule || "Corporation Tax"}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                          {doc.signerName || "Director"}
                        </span>
                        <span className="text-[11px] text-slate-500 font-mono block">
                          {doc.signerEmail || client?.email}
                        </span>
                        <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded font-medium inline-block mt-0.5">
                          {doc.signerRole || "Director"}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        {isSigned ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
                            <CheckCircle2 size={11} /> Signed &amp; Approved
                          </span>
                        ) : isAwaiting ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">
                            <Clock size={11} /> Awaiting Sign-off
                          </span>
                        ) : isDeclined ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                            <XCircle size={11} /> Declined
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                            {doc.status}
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                        {new Date(doc.createdAt).toLocaleDateString("en-GB")}
                      </td>

                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                        {doc.completedAt ? new Date(doc.completedAt).toLocaleString("en-GB") : "—"}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          {/* Audit Log Modal Trigger */}
                          <button
                            type="button"
                            onClick={() => handleOpenAuditModal(doc)}
                            className="px-2 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded font-medium text-[11px] flex items-center gap-1 cursor-pointer transition-colors"
                            title="View chronological audit trail and IP logs"
                          >
                            <Eye size={11} /> Audit Log
                          </button>

                          {/* Copy Signing Link (for Awaiting) */}
                          {doc.publicUrl && isAwaiting && (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(window.location.origin + doc.publicUrl);
                                  setCopiedId(doc.id);
                                  setTimeout(() => setCopiedId(null), 2000);
                                  toast({ title: "Link Copied", description: "Capisign signing URL copied to clipboard" });
                                }}
                                className="px-2 py-1 bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 rounded font-medium text-[11px] flex items-center gap-1 cursor-pointer transition-colors"
                                title="Copy signing URL to clipboard"
                              >
                                {copiedId === doc.id ? <Check size={11} /> : <Copy size={11} />}
                                <span>{copiedId === doc.id ? "Copied" : "Copy Link"}</span>
                              </button>

                              <a
                                href={doc.publicUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="px-2 py-1 bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 rounded font-medium text-[11px] flex items-center gap-1 transition-colors"
                                title="Open digital signature portal in new tab"
                              >
                                <ExternalLink size={11} /> Open Portal
                              </a>
                            </>
                          )}

                          {/* Download Digital Certificate (for Signed) */}
                          {isSigned && (
                            <button
                              type="button"
                              onClick={() => {
                                generatePdfCertificate({
                                  documentId: doc.id,
                                  title: doc.title,
                                  sourceModule: "Corporation Tax",
                                  createdAt: doc.createdAt,
                                  completedAt: doc.completedAt,
                                  signerName: doc.signerName || client?.clientName || "Director",
                                  signerEmail: doc.signerEmail || client?.email || "",
                                });
                              }}
                              className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 rounded font-bold text-[11px] flex items-center gap-1 cursor-pointer transition-colors border border-emerald-200 dark:border-emerald-800"
                              title="Download official digital completion certificate PDF"
                            >
                              <Download size={11} /> Certificate
                            </button>
                          )}

                          {/* Void / Delete button */}
                          <button
                            type="button"
                            onClick={() => handleDeleteDoc(doc.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
                            title="Delete or void this signature request"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Direct Quick Dispatch / Physical Paper Fallback Card */}
      <div className="bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 flex items-center justify-center">
              <Mail size={14} />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                Direct Dispatch CT600 Return to Company Director
              </h3>
              <p className="text-[11px] text-slate-500">
                Dispatches statutory tax return, computation schedule, and declaration to director for instant sign-off.
              </p>
            </div>
          </div>

          {!isReturnSigned && (
            <button
              type="button"
              onClick={() => markSignedMutation.mutate()}
              disabled={markSignedMutation.isPending}
              className="text-xs text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 font-semibold underline cursor-pointer"
            >
              Already received signed paper copy? Mark Signed
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Select Company Director / Signatory *
            </label>
            {directors.length > 0 ? (
              <div className="space-y-2">
                <select
                  value={directorName}
                  onChange={(e) => setDirectorName(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg outline-none focus:ring-1 focus:ring-purple-500 font-medium text-slate-900 dark:text-slate-100 cursor-pointer"
                >
                  {directors.map((d: any) => {
                    const name = d.name || d.officerName || "";
                    const isSign = d.isSignatory || d.isSignatoryOnAccounts;
                    const role = d.role || d.officerRole || "Director";
                    return (
                      <option key={d.id || name} value={name}>
                        {name} ({role}){isSign ? " - Appointed Signatory" : ""}
                      </option>
                    );
                  })}
                  <option value="__custom__">+ Enter custom director name</option>
                </select>

                {directorName === "__custom__" && (
                  <input
                    type="text"
                    value={customDirectorName}
                    onChange={(e) => setCustomDirectorName(e.target.value)}
                    placeholder="Enter full legal name of director"
                    className="w-full text-xs px-3 py-2 border border-purple-300 dark:border-purple-700 bg-white dark:bg-slate-900 rounded-lg outline-none focus:ring-1 focus:ring-purple-500"
                    autoFocus
                  />
                )}
              </div>
            ) : (
              <input
                type="text"
                value={directorName}
                onChange={(e) => setDirectorName(e.target.value)}
                placeholder="Full legal name of director"
                className="w-full text-xs px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg outline-none focus:ring-1 focus:ring-purple-500"
              />
            )}
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Director Email Address *
            </label>
            <input
              type="email"
              value={directorEmail}
              onChange={(e) => setDirectorEmail(e.target.value)}
              placeholder="director@example.com"
              className="w-full text-xs px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg outline-none focus:ring-1 focus:ring-purple-500"
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-emerald-600 shrink-0" />
            <span>Includes CT600 Form, Computation Schedule &amp; Director Declaration</span>
          </div>

          <button
            type="button"
            onClick={() => quickDispatchMutation.mutate()}
            disabled={quickDispatchMutation.isPending || !effectiveDirectorName || !directorEmail.trim()}
            className="w-full sm:w-auto px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-colors"
          >
            <Send size={13} className={quickDispatchMutation.isPending ? "animate-spin" : ""} />
            <span>{quickDispatchMutation.isPending ? "Dispatching to eSign..." : "Dispatch to eSign Portal"}</span>
          </button>
        </div>
      </div>

      {/* Modal: View Chronological Audit Trail Log */}
      {selectedAuditDoc && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-xl shadow-xl overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <ShieldCheck size={16} className="text-purple-600" />
                  Audit Trail &amp; Verification History
                </h3>
                <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                  Document #{selectedAuditDoc.id} • {selectedAuditDoc.title}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAuditDoc(null)}
                className="w-8 h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 flex items-center justify-center cursor-pointer transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-5 max-h-[60vh] overflow-y-auto space-y-4">
              {auditLogsLoading ? (
                <div className="p-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                  <RefreshCw size={14} className="animate-spin text-purple-600" />
                  <span>Loading audit trail events...</span>
                </div>
              ) : auditLogsData.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">
                  No chronological logs recorded for this document yet.
                </p>
              ) : (
                <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
                  {auditLogsData.map((log: any, idx: number) => {
                    const isSigned = log.action === "Signed";
                    const isOpened = log.action === "Opened";
                    const isCreated = log.action === "Created";

                    return (
                      <div key={idx} className="relative">
                        <div
                          className={`absolute -left-6 top-1 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-slate-900 ${
                            isSigned
                              ? "bg-emerald-600"
                              : isOpened
                              ? "bg-purple-600"
                              : isCreated
                              ? "bg-blue-600"
                              : "bg-slate-400"
                          }`}
                        />
                        <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                              {log.action}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {new Date(log.timestamp).toLocaleString("en-GB")}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                            {log.details}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
              <span className="text-[11px] text-slate-500 font-mono">
                Immutable UK eIDAS / ECA 2000 Audit Log
              </span>
              <button
                type="button"
                onClick={() => setSelectedAuditDoc(null)}
                className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-semibold cursor-pointer transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Full Send to eSign (Wizard Modal) */}
      {showeSignModal && (
        <SendToeSignModal
          open={showeSignModal}
          onOpenChange={(isOpen) => {
            setShoweSignModal(isOpen);
            if (!isOpen) {
              refetcheSignDocs();
              refetchReturns();
            }
          }}
          defaultTitle={`CT600 Return & Corporation Tax Computation (${currentReturn?.taxYear || "2026/2027"}) - ${client?.clientName}`}
          sourceModule="Corporation Tax"
          clientId={parseInt(clientId || "0")}
          clientName={effectiveDirectorName || client?.contactPerson || client?.clientName || ""}
          clientEmail={client?.email || ""}
        />
      )}
    </div>
  );
}
