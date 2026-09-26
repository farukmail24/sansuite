import { useState, useEffect, useRef } from "react";
import { useRoute } from "wouter";
import {
  FileText, CheckCircle2, ShieldCheck, PenTool, AlertCircle,
  Lock, KeyRound, Type, RotateCcw, Building2, Calendar,
  Clock, Download, Check, XCircle, FileCheck, ExternalLink,
  Upload, Trash2
} from "lucide-react";
import { generatePdfCertificate } from "../../lib/pdfCertificateGenerator";
import StatutoryAccountsReview from "../../components/esign/StatutoryAccountsReview";
import StatutoryCT600Review from "../../components/esign/StatutoryCT600Review";

export default function PublicSignPage() {
  const [matcheSign, paramseSign] = useRoute("/esign/public/:token");
  const [matchESign, paramsESign] = useRoute("/esign/public/:token");
  const token = matchESign ? paramsESign.token : (matcheSign ? paramseSign.token : "");

  const [documentData, setDocumentData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [signed, setSigned] = useState(false);
  const [signing, setSigning] = useState(false);
  const [signingResult, setSigningResult] = useState<any>(null);

  // Security Passcode Protection State
  const [isPasscodeRequired, setIsPasscodeRequired] = useState(false);
  const [passcode, setPasscode] = useState("");
  const [passcodeVerified, setPasscodeVerified] = useState(false);
  const [passcodeError, setPasscodeError] = useState("");
  const [verifyingPasscode, setVerifyingPasscode] = useState(false);

  // Signature Input Mode: "draw" | "type" | "upload"
  const [signMode, setSignMode] = useState<"draw" | "type" | "upload">("draw");
  const [typedName, setTypedName] = useState("");
  const [selectedFont, setSelectedFont] = useState<string>("font-serif italic");
  const [legalConsent, setLegalConsent] = useState(false);
  const [uploadedSignImage, setUploadedSignImage] = useState<string | null>(null);
  const [isDraggingSignImage, setIsDraggingSignImage] = useState(false);
  const signImageInputRef = useRef<HTMLInputElement | null>(null);

  // Canvas State for Drawing
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  const handleSignImageFile = (file: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file (PNG, JPG, SVG, WebP).");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Signature image file size must be less than 5 MB.");
      return;
    }
    setError("");
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setUploadedSignImage(result);
    };
    reader.readAsDataURL(file);
  };

  // Decline Modal State
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const [declining, setDeclining] = useState(false);
  const [declined, setDeclined] = useState(false);

  useEffect(() => {
    if (!token) return;
    fetch(`/api/esign/public/documents/${token}`)
      .then((res) => {
        if (!res.ok) throw new Error("Document not found or signature link has expired.");
        return res.json();
      })
      .then((data) => {
        let normalizedAtts: any[] = [];
        if (Array.isArray(data.attachments)) {
          normalizedAtts = data.attachments;
        } else if (typeof data.attachments === "string" && data.attachments.trim()) {
          try {
            const parsed = JSON.parse(data.attachments);
            normalizedAtts = Array.isArray(parsed) ? parsed : [];
          } catch {
            normalizedAtts = [];
          }
        } else if (data.filePath) {
          normalizedAtts = [{ fileName: data.title || "Document", filePath: data.filePath, fileSize: data.fileSize }];
        }
        data.attachments = normalizedAtts;

        setDocumentData(data);
        if (data.signerName) {
          setTypedName(data.signerName);
        }
        if (data.status === "Signed" || data.signerStatus === "Signed") {
          setSigned(true);
          setSigningResult({
            completedAt: data.completedAt || new Date().toISOString(),
            ipAddress: data.ipAddress || "Verified",
          });
        }
        if (data.status === "Declined" || data.signerStatus === "Declined") {
          setDeclined(true);
        }
        if (data.isPasswordProtected && data.hasAccessCode) {
          setIsPasscodeRequired(true);
        } else {
          setPasscodeVerified(true);
        }
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [token]);

  // Canvas Drawing Handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
    setHasDrawn(true);
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
    setHasDrawn(false);
  };

  // Passcode Verification
  const handleVerifyPasscode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passcode.trim()) return;

    setVerifyingPasscode(true);
    setPasscodeError("");
    try {
      const res = await fetch(`/api/esign/public/documents/${token}/verify-passcode`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode: passcode.trim() }),
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.message || "Incorrect passcode");
      }

      setPasscodeVerified(true);
    } catch (err: any) {
      setPasscodeError(err.message || "Failed to verify security passcode.");
    } finally {
      setVerifyingPasscode(false);
    }
  };

  // Submit Signature
  const handleSign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!legalConsent) return;

    let signaturePayload = "";
    if (signMode === "draw") {
      const canvas = canvasRef.current;
      if (!canvas || !hasDrawn) return;
      signaturePayload = canvas.toDataURL("image/png");
    } else if (signMode === "type") {
      if (!typedName.trim()) return;
      signaturePayload = JSON.stringify({
        type: "TYPED",
        name: typedName.trim(),
        font: selectedFont,
      });
    } else if (signMode === "upload") {
      if (!uploadedSignImage) return;
      signaturePayload = uploadedSignImage;
    }

    setSigning(true);
    try {
      const res = await fetch(`/api/esign/public/documents/${token}/sign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          signatureData: signaturePayload,
          passcode: passcode.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.message || "Failed to submit signature");
      }

      const result = await res.json();
      setSigningResult(result);
      setSigned(true);
    } catch (err: any) {
      setError(err.message || "Failed to submit signature");
    } finally {
      setSigning(false);
    }
  };

  // Decline Document
  const handleDecline = async (e: React.FormEvent) => {
    e.preventDefault();
    setDeclining(true);
    try {
      const res = await fetch(`/api/esign/public/documents/${token}/decline`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: declineReason }),
      });

      if (!res.ok) throw new Error("Failed to decline document");
      setDeclined(true);
      setShowDeclineModal(false);
    } catch (err: any) {
      alert(err.message || "Failed to decline document");
    } finally {
      setDeclining(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 text-center max-w-sm w-full space-y-4">
          <div className="w-10 h-10 border-3 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-slate-600 text-sm font-medium">Securing connection to eSign...</p>
        </div>
      </div>
    );
  }

  if (error || !documentData) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-sm max-w-md w-full text-center border border-slate-200">
          <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-rose-100">
            <AlertCircle size={28} />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Invalid or Expired Link</h2>
          <p className="text-slate-500 text-sm leading-relaxed mb-6">
            {error || "This document link is no longer valid, has been completed, or has been revoked by your accounting firm."}
          </p>
          <p className="text-xs text-slate-400">
            Please contact your accounting representative for an updated signing invitation.
          </p>
        </div>
      </div>
    );
  }

  // Passcode Verification Modal
  if (isPasscodeRequired && !passcodeVerified) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md w-full border border-slate-200">
          <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center mx-auto mb-4 border border-purple-100">
            <Lock size={24} />
          </div>
          <h2 className="text-xl font-bold text-slate-800 text-center mb-1">Protected Document</h2>
          <p className="text-xs text-slate-500 text-center mb-6">
            This document is secured with an access passcode provided by your accountant.
          </p>

          <form onSubmit={handleVerifyPasscode} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Enter Security Passcode
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  placeholder="e.g. 123456"
                  className="w-full px-4 py-3 pl-10 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none font-mono"
                />
                <KeyRound size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
              </div>
              {passcodeError && (
                <p className="text-xs text-rose-600 font-medium mt-1.5 flex items-center gap-1">
                  <AlertCircle size={13} /> {passcodeError}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={verifyingPasscode || !passcode.trim()}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 rounded-xl transition-all shadow-sm disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              {verifyingPasscode ? "Verifying..." : "Unlock Document"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6">
      <div className="max-w-3xl w-full mx-auto space-y-6">
        {/* Practice Firm Header */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm shrink-0" style={{ background: "linear-gradient(135deg, #6c5ce7 0%, #a29bfe 100%)" }}>
              <Building2 size={18} />
            </div>
            <div>
              <h1 className="font-bold text-slate-900 text-base leading-snug">
                {documentData.firmInfo?.firmName || "SanSuite Accounting Firm"}
              </h1>
              <p className="text-xs text-slate-500 flex items-center gap-1">
                <ShieldCheck size={13} className="text-emerald-600" /> Official E-Signature Portal (UK eIDAS / ECA 2000)
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg shrink-0">
            <Calendar size={13} />
            <span>Created: {new Date(documentData.createdAt).toLocaleDateString("en-GB")}</span>
          </div>
        </div>

        {/* Document Status Banner if Already Signed or Declined */}
        {signed && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center space-y-3 shadow-xs">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 size={26} />
            </div>
            <h2 className="text-xl font-bold text-emerald-900">Document Successfully Signed!</h2>
            <p className="text-xs text-emerald-700 max-w-lg mx-auto leading-relaxed">
              Your electronic signature has been officially recorded and timestamped. An immutable digital certificate has been issued to your accounting team.
            </p>
            <div className="inline-flex items-center gap-4 text-xs text-emerald-800 bg-white/70 px-4 py-2 rounded-xl border border-emerald-200 mt-2 font-mono">
              <span>Timestamp: {new Date(signingResult?.completedAt || Date.now()).toLocaleString("en-GB")}</span>
              <span>IP: {signingResult?.ipAddress || "Verified"}</span>
            </div>

            <div className="pt-3 flex flex-wrap items-center justify-center gap-3">
              <a
                href={signingResult?.signedFilePath || documentData.signedFilePath || `/uploads/esign/signed_doc_${documentData.id}.pdf`}
                target="_blank"
                rel="noreferrer"
                download={`${documentData.title || "Document"}_Signed.pdf`}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-5 py-2.5 rounded-xl transition-all shadow-xs inline-flex items-center gap-2 cursor-pointer"
              >
                <FileCheck size={14} /> Download Signed Document (PDF)
              </a>

              <button
                type="button"
                onClick={() => {
                  generatePdfCertificate({
                    documentId: documentData.id,
                    title: documentData.title,
                    sourceModule: documentData.sourceModule,
                    createdAt: documentData.createdAt,
                    completedAt: signingResult?.completedAt || documentData.completedAt || new Date(),
                    verificationToken: token,
                    firmName: documentData.firmInfo?.firmName,
                    signerName: documentData.signerName,
                    signerEmail: documentData.signerEmail,
                    signerRole: documentData.signerRole,
                    ipAddress: signingResult?.ipAddress || documentData.ipAddress,
                    signatureData: documentData.signatureData,
                  });
                }}
                className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-semibold text-xs px-4 py-2.5 rounded-xl transition-all shadow-xs inline-flex items-center gap-2 cursor-pointer"
              >
                <Download size={14} /> Download Certificate Only (PDF)
              </button>
            </div>
          </div>
        )}

        {declined && (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-center space-y-2 shadow-xs">
            <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto">
              <XCircle size={26} />
            </div>
            <h2 className="text-xl font-bold text-rose-900">Document Declined</h2>
            <p className="text-xs text-rose-700">
              You have declined to sign this document. Your feedback has been forwarded to your accountant.
            </p>
          </div>
        )}

        {/* Main Document Summary Card */}
        {!signed && !declined && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-purple-50 text-purple-700 rounded-lg text-xs font-semibold mb-2.5 border border-purple-100">
                <FileText size={13} /> {documentData.sourceModule || "Accounting Document"}
              </div>
              <h2 className="text-2xl font-bold text-slate-800 tracking-tight">{documentData.title}</h2>
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 mt-2">
                <span>Signer: <strong className="text-slate-700">{documentData.signerName}</strong></span>
                <span>Email: <strong className="text-slate-700">{documentData.signerEmail}</strong></span>
                <span>Role: <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium">{documentData.signerRole || "Signer"}</span></span>
              </div>
            </div>

            {documentData.message && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-600 leading-relaxed">
                <span className="font-semibold text-slate-800 block mb-1">Message from Accountant:</span>
                "{documentData.message}"
              </div>
            )}

            {/* Statutory CT600 Review Pack, Statutory Accounts Review Pack, or Generic Document Preview */}
            {documentData.statutoryCT600Summary ? (
              <div className="space-y-4">
                <StatutoryCT600Review
                  ct600={documentData.statutoryCT600Summary}
                  signerName={documentData.signerName}
                  signerRole={documentData.signerRole}
                />

                {/* Additional Attached PDF Documents if available */}
                {Array.isArray(documentData.attachments) && documentData.attachments.length > 0 && (
                  <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-2">
                    <span className="text-xs font-bold text-slate-700 block">
                      Attached Documents to Review ({documentData.attachments.length}):
                    </span>
                    <div className="grid grid-cols-1 gap-2">
                      {documentData.attachments.map((att: any, attIdx: number) => {
                        const fileUrl = att.filePath?.startsWith("/uploads/")
                          ? att.filePath
                          : `/uploads/esign/${att.filePath}`;
                        return (
                          <div
                            key={attIdx}
                            className="bg-white border border-slate-200 rounded-xl p-3 flex items-center justify-between gap-3 shadow-2xs"
                          >
                            <div className="flex items-center gap-2">
                              <FileText size={16} className="text-purple-600" />
                              <span className="text-xs font-bold text-slate-800">{att.fileName}</span>
                            </div>
                            <a
                              href={fileUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="px-3 py-1 bg-purple-50 text-purple-700 rounded text-xs font-semibold hover:bg-purple-100 flex items-center gap-1"
                            >
                              <ExternalLink size={12} /> View Document
                            </a>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : documentData.statutoryAccountsSummary ? (
              <div className="space-y-4">
                <StatutoryAccountsReview
                  accounts={documentData.statutoryAccountsSummary}
                  signerName={documentData.signerName}
                  signerRole={documentData.signerRole}
                />

                {/* Additional Attached PDF Documents if available */}
                {Array.isArray(documentData.attachments) && documentData.attachments.length > 0 && (
                  <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-2">
                    <span className="text-xs font-bold text-slate-700 block">
                      Additional Attached Documents ({documentData.attachments.length}):
                    </span>
                    <div className="grid grid-cols-1 gap-2">
                      {documentData.attachments.map((att: any, attIdx: number) => {
                        const fileUrl = att.filePath?.startsWith("/uploads/")
                          ? att.filePath
                          : `/uploads/esign/${att.filePath}`;
                        return (
                          <div
                            key={attIdx}
                            className="bg-white border border-slate-200 rounded-xl p-3 flex items-center justify-between gap-3 shadow-2xs"
                          >
                            <div className="flex items-center gap-2">
                              <FileText size={16} className="text-purple-600" />
                              <span className="text-xs font-bold text-slate-800">{att.fileName}</span>
                            </div>
                            <a
                              href={fileUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="px-3 py-1 bg-purple-50 text-purple-700 rounded text-xs font-semibold hover:bg-purple-100 flex items-center gap-1"
                            >
                              <ExternalLink size={12} /> View Document
                            </a>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="border border-slate-200 rounded-xl p-6 bg-slate-50/50 space-y-4">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <span>Document Details & Scope</span>
                  <span className="text-purple-600 font-medium lowercase">PDF Verification Engine</span>
                </div>
                <div className="bg-white border border-slate-200 rounded-lg p-5 text-sm text-slate-700 leading-relaxed shadow-xs">
                  <p className="mb-3">
                    This electronic signing request concerns: <strong className="text-slate-900">{documentData.title}</strong>.
                  </p>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    By signing, you authorize your nominated accounting practice to act in accordance with the attached statutory filing or engagement terms. All interactions are cryptographically verified with IP and user-agent logging under UK statutory guidelines.
                  </p>
                </div>

                {/* Attached Documents List */}
                {Array.isArray(documentData.attachments) && documentData.attachments.length > 0 ? (
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-slate-700 block">
                      Attached Documents to Review ({documentData.attachments.length}):
                    </span>
                    <div className="grid grid-cols-1 gap-2">
                      {documentData.attachments.map((att: any, attIdx: number) => {
                        const fileUrl = att.filePath?.startsWith("/uploads/")
                          ? att.filePath
                          : `/uploads/esign/${att.filePath}`;
                        return (
                          <div
                            key={attIdx}
                            className="bg-white border border-slate-200 rounded-xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs hover:border-purple-300 transition-colors"
                          >
                            <div className="flex items-center gap-2.5">
                              <span className="w-6 h-6 rounded-md bg-purple-100 text-purple-700 flex items-center justify-center text-xs font-bold shrink-0">
                                {attIdx + 1}
                              </span>
                              <div className="w-8 h-8 bg-purple-50 text-purple-600 rounded-lg flex items-center justify-center shrink-0">
                                <FileText size={16} />
                              </div>
                              <div>
                                <span className="text-xs font-bold text-slate-900 block">{att.fileName}</span>
                                <span className="text-[11px] text-slate-400 font-mono">
                                  {att.fileSize && att.fileSize > 1024 * 1024
                                    ? `${(att.fileSize / (1024 * 1024)).toFixed(1)} MB`
                                    : `${Math.round((att.fileSize || 250000) / 1024)} KB`} • PDF Document
                                </span>
                              </div>
                            </div>

                            <a
                              href={fileUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 shrink-0 self-end sm:self-auto transition-colors"
                            >
                              <ExternalLink size={12} /> View Document
                            </a>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : documentData.filePath ? (
                  <div className="bg-purple-50/50 border border-purple-200 rounded-xl p-3.5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 bg-purple-100 text-purple-700 rounded-lg flex items-center justify-center shrink-0">
                        <FileText size={16} />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-900 block">{documentData.title}.pdf</span>
                        <span className="text-[11px] text-slate-500">Review all accounts, tax computations, and figures before signing</span>
                      </div>
                    </div>
                    <a
                      href={
                        documentData.filePath.startsWith("/uploads/")
                          ? documentData.filePath
                          : `/uploads/esign/${documentData.filePath}`
                      }
                      target="_blank"
                      rel="noreferrer"
                      className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 shrink-0 shadow-2xs"
                    >
                      <ExternalLink size={13} /> View Attached PDF
                    </a>
                  </div>
                ) : null}
              </div>
            )}

            {/* Signature Studio Section */}
            <div className="border-t border-slate-100 pt-6 space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Create Your Digital Signature</h3>
                  <p className="text-xs text-slate-500">Choose between drawing your signature or generating a cursive digital signature</p>
                </div>
                {/* Mode Selector */}
                <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setSignMode("draw")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${signMode === "draw" ? "bg-white text-purple-700 shadow-xs" : "text-slate-500 hover:text-slate-800"
                      }`}
                  >
                    <PenTool size={13} /> Draw
                  </button>
                  <button
                    type="button"
                    onClick={() => setSignMode("type")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${signMode === "type" ? "bg-white text-purple-700 shadow-xs" : "text-slate-500 hover:text-slate-800"
                      }`}
                  >
                    <Type size={13} /> Type
                  </button>
                  <button
                    type="button"
                    onClick={() => setSignMode("upload")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${signMode === "upload" ? "bg-white text-purple-700 shadow-xs" : "text-slate-500 hover:text-slate-800"
                      }`}
                  >
                    <Upload size={13} /> Upload Image
                  </button>
                </div>
              </div>

              {/* Draw Mode Canvas */}
              {signMode === "draw" && (
                <div className="space-y-2">
                  <div className="relative border-2 border-dashed border-slate-300 rounded-2xl bg-white overflow-hidden shadow-inner">
                    <canvas
                      ref={canvasRef}
                      width={600}
                      height={180}
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                      onTouchStart={startDrawing}
                      onTouchMove={draw}
                      onTouchEnd={stopDrawing}
                      className="w-full h-[180px] cursor-crosshair touch-none"
                    />
                    {!hasDrawn && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-slate-300 text-sm font-medium">
                        Sign here using mouse or touch...
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                    <span>Draw with mouse or fingertip</span>
                    <button
                      type="button"
                      onClick={clearCanvas}
                      className="text-slate-500 hover:text-slate-800 flex items-center gap-1 font-medium transition-colors cursor-pointer"
                    >
                      <RotateCcw size={12} /> Clear Signature
                    </button>
                  </div>
                </div>
              )}

              {/* Type Mode */}
              {signMode === "type" && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Full Legal Name for Electronic Signature
                    </label>
                    <input
                      type="text"
                      value={typedName}
                      onChange={(e) => setTypedName(e.target.value)}
                      placeholder="e.g. John Doe"
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                    />
                  </div>

                  {/* Font Selection Previews */}
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { id: "font-serif italic", name: "Classic Script" },
                      { id: "font-mono italic", name: "Modern Script" },
                    ].map((f) => (
                      <div
                        key={f.id}
                        onClick={() => setSelectedFont(f.id)}
                        className={`p-4 rounded-xl border cursor-pointer transition-all ${selectedFont === f.id
                          ? "border-purple-600 bg-purple-50/40 shadow-xs"
                          : "border-slate-200 hover:border-slate-300 bg-white"
                          }`}
                      >
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">{f.name}</span>
                        <div className={`text-xl text-slate-800 tracking-wider truncate ${f.id}`}>
                          {typedName || "Sample Signature"}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Upload Image Mode */}
              {signMode === "upload" && (
                <div className="space-y-3">
                  <input
                    type="file"
                    ref={signImageInputRef}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleSignImageFile(file);
                    }}
                    accept="image/png,image/jpeg,image/svg+xml,image/webp"
                    className="hidden"
                  />

                  {uploadedSignImage ? (
                    <div className="border-2 border-slate-200 rounded-2xl bg-slate-50/50 p-4 space-y-3">
                      <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                        <span className="flex items-center gap-1.5 text-emerald-700 font-bold">
                          <CheckCircle2 size={14} className="text-emerald-600" /> Signature Image Ready
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setUploadedSignImage(null);
                            if (signImageInputRef.current) signImageInputRef.current.value = "";
                          }}
                          className="text-rose-600 hover:text-rose-700 text-xs font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 size={12} /> Replace Image
                        </button>
                      </div>

                      <div className="h-44 bg-white border border-slate-200 rounded-xl flex items-center justify-center p-4 overflow-hidden relative shadow-inner">
                        <img
                          src={uploadedSignImage}
                          alt="Uploaded Signature"
                          className="max-h-full max-w-full object-contain filter drop-shadow-sm"
                        />
                      </div>
                    </div>
                  ) : (
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        setIsDraggingSignImage(true);
                      }}
                      onDragLeave={() => setIsDraggingSignImage(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setIsDraggingSignImage(false);
                        const dropped = e.dataTransfer.files?.[0];
                        if (dropped) handleSignImageFile(dropped);
                      }}
                      onClick={() => signImageInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer space-y-3 ${isDraggingSignImage
                        ? "border-purple-600 bg-purple-50/50 scale-[1.01]"
                        : "border-slate-300 hover:border-purple-400 hover:bg-purple-50/20"
                        }`}
                    >
                      <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center mx-auto">
                        <Upload size={22} />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-800">
                          {isDraggingSignImage ? "Drop your signature image here" : "Click to browse or drag & drop signature image"}
                        </p>
                        <p className="text-[11px] text-slate-400 mt-1">
                          PNG, JPG, SVG or WebP with transparent background recommended (up to 5MB)
                        </p>
                      </div>
                      <button
                        type="button"
                        className="px-4 py-2 bg-white text-purple-700 border border-purple-200 rounded-xl text-xs font-bold shadow-2xs hover:bg-purple-50 transition-colors pointer-events-none"
                      >
                        Browse Image File
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Legal Confirmation Statement */}
              <div className="bg-purple-50/50 border border-purple-100 rounded-xl p-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={legalConsent}
                    onChange={(e) => setLegalConsent(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded text-purple-600 focus:ring-purple-500 border-slate-300 cursor-pointer"
                  />
                  <span className="text-xs text-slate-600 leading-relaxed select-none">
                    I agree and confirm that my electronic signature submitted herein represents my legally binding agreement under the <strong>UK Electronic Communications Act 2000</strong> and EU/UK eIDAS Regulation.
                  </span>
                </label>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                <button
                  type="button"
                  disabled={
                    signing ||
                    !legalConsent ||
                    (signMode === "draw"
                      ? !hasDrawn
                      : signMode === "type"
                        ? !typedName.trim()
                        : !uploadedSignImage)
                  }
                  onClick={handleSign}
                  className="w-full sm:flex-1 bg-purple-600 hover:bg-purple-700 text-white py-3.5 px-6 rounded-xl font-semibold shadow-sm transition-all disabled:opacity-40 flex items-center justify-center gap-2 cursor-pointer text-sm"
                >
                  {signing ? (
                    <>Submitting Cryptographic Signature...</>
                  ) : (
                    <>
                      <Check size={16} /> Sign & Approve Document
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeclineModal(true)}
                  className="w-full sm:w-auto px-5 py-3.5 border border-slate-200 text-slate-600 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50/50 rounded-xl font-medium text-xs transition-all cursor-pointer"
                >
                  Decline to Sign
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Decline Confirmation Modal */}
        {showDeclineModal && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
              <h3 className="text-lg font-bold text-slate-800">Decline Signature Request</h3>
              <p className="text-xs text-slate-500">
                Please provide a brief reason why you are declining to sign this document so your accountant can address any questions.
              </p>
              <textarea
                rows={3}
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                placeholder="e.g. Needs revision of year-end turnover numbers..."
                className="w-full p-3 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none"
              />
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDeclineModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={declining}
                  onClick={handleDecline}
                  className="px-4 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-colors cursor-pointer"
                >
                  {declining ? "Submitting..." : "Confirm Decline"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
