import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import ClientWorkspaceLayout, { useClientWorkspace } from "./ClientWorkspaceLayout";
import { apiRequest } from "../../../lib/queryClient";
import { useToast } from "../../../hooks/useToast";
import SendToeSignModal from "../../../components/esign/SendToeSignModal";
import { generatePdfCertificate } from "../../../lib/pdfCertificateGenerator";
import {
  FileSignature, Send, Download, RefreshCw, Copy, CheckCircle2,
  Clock, XCircle, Eye, Trash2, ShieldCheck, ExternalLink,
  Calendar, User, FileText, Check, AlertCircle, X
} from "lucide-react";
import { PipelineFooterNav } from "./AccountsProductionPipeline";

export default function eSignWorkspacePage() {
  return (
    <ClientWorkspaceLayout activeSection="eSign">
      <ESignWorkspaceContent />
    </ClientWorkspaceLayout>
  );
}

function ESignWorkspaceContent() {
  const { clientId, client, currentPeriod } = useClientWorkspace();
  const { toast } = useToast();
  const [showeSignModal, setShoweSignModal] = useState(false);

  // Audit trail modal state
  const [selectedAuditDoc, setSelectedAuditDoc] = useState<any | null>(null);
  const [auditLogsLoading, setAuditLogsLoading] = useState(false);
  const [auditLogsData, setAuditLogsData] = useState<any[]>([]);

  const { data: alleSignData, isLoading, refetch: refetcheSignDocs } = useQuery<any>({
    queryKey: ["/api/esign/documents"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/esign/documents");
      if (!res.ok) return { documents: [] };
      return res.json();
    },
  });

  // Safely extract documents array whether backend returned { documents: [...] } or direct array
  const allDocs: any[] = Array.isArray(alleSignData?.documents)
    ? alleSignData.documents
    : (Array.isArray(alleSignData) ? alleSignData : []);

  const clientDocs = allDocs.filter(
    (d: any) => d.clientId === parseInt(clientId || "0")
  );

  const signedCount = clientDocs.filter((d: any) => d.status === "Signed").length;
  const awaitingCount = clientDocs.filter(
    (d: any) => d.status === "AwaitingApproval" || d.status === "Awaiting"
  ).length;
  const latestSignedDoc = clientDocs.find((d: any) => d.status === "Signed");

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
      refetcheSignDocs();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to delete document",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div>
          <h2 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <FileSignature size={16} className="text-purple-600" />
            eSign Portal (Accounts Approval)
          </h2>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            UK Electronic Communications Act 2000 &amp; eIDAS compliant statutory sign-off by company directors.
          </p>
        </div>
        <button
          onClick={() => setShoweSignModal(true)}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium text-xs flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
        >
          <Send size={13} /> Dispatch New Accounts to eSign
        </button>
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

      {/* Executive Statutory Approval Milestone Banner (When a document is Signed) */}
      {latestSignedDoc && (
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
                  Annual Accounts Legally Approved by Board of Directors
                </h3>
                <p className="text-xs text-emerald-800 dark:text-emerald-300 leading-relaxed">
                  The financial statements for <strong>{client?.clientName || "the company"}</strong> have been digitally signed and validated in compliance with <strong>Section 414 &amp; 477 of the UK Companies Act 2006</strong>.
                </p>
                <div className="flex flex-wrap items-center gap-3 text-[11px] text-emerald-700 dark:text-emerald-400 pt-1 font-mono">
                  <span>Signatory: <strong>{latestSignedDoc.signerName}</strong></span>
                  <span>Email: {latestSignedDoc.signerEmail}</span>
                  <span>Role: {latestSignedDoc.signerRole || "Director"}</span>
                  <span>Date: {new Date(latestSignedDoc.completedAt || latestSignedDoc.createdAt).toLocaleString("en-GB")}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0 self-end md:self-center">
              <button
                type="button"
                onClick={() => {
                  generatePdfCertificate({
                    documentId: latestSignedDoc.id,
                    title: latestSignedDoc.title,
                    sourceModule: "Accounts Production",
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

              <Link
                href={`/accounts-production/${clientId}/submit`}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
              >
                Continue to Step 7: Statutory Submission &rarr;
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
            onClick={() => refetcheSignDocs()}
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
            <p className="text-xs text-slate-400">No signature requests generated yet for this client.</p>
            <button
              onClick={() => setShoweSignModal(true)}
              className="text-xs text-purple-600 hover:underline font-semibold cursor-pointer"
            >
              Click here to dispatch Annual Accounts approval request
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
                          ID: #{doc.id} • {doc.sourceModule || "Accounts Production"}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                          {doc.signerName || "Client"}
                        </span>
                        <span className="text-[11px] text-slate-500 font-mono block">
                          {doc.signerEmail}
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
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(window.location.origin + doc.publicUrl);
                                toast({ title: "Link Copied", description: "Signing URL copied to clipboard" });
                              }}
                              className="px-2 py-1 bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 rounded font-medium text-[11px] flex items-center gap-1 cursor-pointer transition-colors"
                              title="Copy signing URL to clipboard"
                            >
                              <Copy size={11} /> Copy Link
                            </button>
                          )}

                          {/* Download Digital Certificate (for Signed) */}
                          {isSigned && (
                            <button
                              type="button"
                              onClick={() => {
                                generatePdfCertificate({
                                  documentId: doc.id,
                                  title: doc.title,
                                  sourceModule: "Accounts Production",
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

      {/* Modal: Send to eSign */}
      {showeSignModal && (
        <SendToeSignModal
          open={showeSignModal}
          onOpenChange={(isOpen) => {
            setShoweSignModal(isOpen);
            if (!isOpen) refetcheSignDocs();
          }}
          defaultTitle={`Annual Accounts Approval (${currentPeriod?.endDate ? new Date(currentPeriod.endDate).getFullYear() : new Date().getFullYear()})`}
          sourceModule="Accounts Production"
          clientId={parseInt(clientId || "0")}
          clientName={client?.clientName || ""}
          clientEmail={client?.email || ""}
        />
      )}

      {/* Bottom Pipeline Navigation */}
      <PipelineFooterNav
        clientId={clientId}
        currentStepSlug="esign"
        statusNotice={
          signedCount > 0
            ? "Director sign-off complete — ready for Statutory Submission to Companies House & HMRC"
            : clientDocs.length > 0
            ? `${clientDocs.length} eSign Document(s) Dispatched — Awaiting Director Sign-off`
            : "Dispatch accounts to client directors for digital approval"
        }
      />
    </div>
  );
}
