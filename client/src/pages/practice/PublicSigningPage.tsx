import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute } from "wouter";
import {
  FileSignature, CheckCircle2, ShieldCheck,
  AlertCircle, Download, Check, RefreshCw
} from "lucide-react";
import { apiRequest } from "../../lib/queryClient";

export default function PublicSigningPage() {
  const [, params] = useRoute("/public/sign/:token");
  const token = params?.token;

  const [signerName, setSignerName] = useState("");
  const [signatureType, setSignatureType] = useState<"draw" | "type">("type");
  const [typedSignature, setTypedSignature] = useState("");
  const [hasConsented, setHasConsented] = useState(false);
  const [isSignedSuccess, setIsSignedSuccess] = useState(false);
  const [auditCert, setAuditCert] = useState<any>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // Fetch document details
  const { data: doc, isLoading, error } = useQuery<any>({
    queryKey: [`/api/pm/loe/public/${token}`],
    queryFn: async () => {
      const res = await fetch(`/api/pm/loe/public/${token}`);
      if (!res.ok) throw new Error("Document not found or signing link expired.");
      return res.json();
    },
    enabled: !!token
  });

  useEffect(() => {
    if (doc?.signeeName) setSignerName(doc.signeeName);
    if (doc?.status === "Signed") setIsSignedSuccess(true);
  }, [doc]);

  // Canvas drawing handlers
  const startDrawing = (e: any) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches?.[0]?.clientX) - rect.left;
    const y = (e.clientY || e.touches?.[0]?.clientY) - rect.top;
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: any) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches?.[0]?.clientX) - rect.left;
    const y = (e.clientY || e.touches?.[0]?.clientY) - rect.top;
    ctx.lineTo(x, y);
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
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

  // Submit Signature Mutation
  const signMutation = useMutation({
    mutationFn: async () => {
      let signatureDataUrl = "";
      if (signatureType === "draw" && canvasRef.current) {
        signatureDataUrl = canvasRef.current.toDataURL("image/png");
      } else {
        signatureDataUrl = `TYPE:${typedSignature}`;
      }

      return await apiRequest("POST", `/api/pm/loe/public/${token}`, {
        signeeName: signerName,
        signatureDataUrl,
      });
    },
    onSuccess: (data: any) => {
      setIsSignedSuccess(true);
      setAuditCert(data.auditCertificate);
    }
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-4">
        <div className="text-center text-xs text-slate-500 space-y-2">
          <RefreshCw className="animate-spin mx-auto text-indigo-600" size={24} />
          <p>Verifying secure electronic signature portal...</p>
        </div>
      </div>
    );
  }

  if (error || !doc) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-4">
        <div className="max-w-md w-full bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-md text-center space-y-3">
          <AlertCircle className="mx-auto text-rose-500" size={32} />
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Document Unavailable</h2>
          <p className="text-xs text-slate-500">This document signing link is invalid, expired, or has already been fulfilled.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 py-10 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Top Branding Bar */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-600 text-white font-bold flex items-center justify-center text-sm shadow-md">
              SS
            </div>
            <div>
              <h1 className="text-sm font-bold text-slate-900 dark:text-slate-100">{doc.practiceName || "SanSuite Practice"}</h1>
              <p className="text-[11px] text-slate-500">Capisign Electronic Document Portal</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
            <ShieldCheck size={14} /> 256-Bit Encrypted
          </div>
        </div>

        {/* Document Container */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          {/* Header Banner */}
          <div className="bg-indigo-600 p-6 text-white text-center space-y-1">
            <h2 className="text-lg font-bold tracking-tight">{doc.documentTitle}</h2>
            <p className="text-xs text-indigo-100">Prepared for: {doc.clientName}</p>
          </div>

          {/* Body Content */}
          <div className="p-8 space-y-6 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2">
              <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">Contract Summary</h3>
              <p>Quoted Agreed Professional Fee: <strong className="text-slate-900 dark:text-slate-100">£{doc.totalFeeQuoted}</strong></p>
              <div>
                <p className="font-medium text-slate-800 dark:text-slate-200 mb-1">Contracted Scope of Services:</p>
                <ul className="list-disc pl-5 space-y-1 text-slate-600 dark:text-slate-400">
                  {doc.servicesIncluded?.map((s: string, i: number) => <li key={i}>{s}</li>)}
                </ul>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-bold text-slate-900 dark:text-slate-100">Terms & Conditions of Engagement</h4>
              <p>
                By signing this document, the client agrees to appoint the practice as their registered accountants and tax agents.
                The practice will perform compliance duties in accordance with the regulatory standards of ICAEW/ACCA and UK HMRC guidelines.
              </p>
              <p>
                In accordance with the UK Electronic Communications Act 2000 and European eIDAS regulation, your electronic signature carries the full legal weight of a handwritten signature.
              </p>
            </div>

            {/* Signature Section */}
            {!isSignedSuccess ? (
              <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800 space-y-4">
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <FileSignature className="text-indigo-600" size={16} />
                  Electronic Signature & Acceptance
                </h3>

                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Full Legal Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Jane Doe"
                    value={signerName}
                    onChange={(e) => setSignerName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs"
                  />
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <button
                      onClick={() => setSignatureType("type")}
                      className={`px-3 py-1 rounded-md text-xs font-medium ${
                        signatureType === "type"
                          ? "bg-indigo-600 text-white"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-600"
                      }`}
                    >
                      Type Signature
                    </button>
                    <button
                      onClick={() => setSignatureType("draw")}
                      className={`px-3 py-1 rounded-md text-xs font-medium ${
                        signatureType === "draw"
                          ? "bg-indigo-600 text-white"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-600"
                      }`}
                    >
                      Draw on Screen
                    </button>
                  </div>

                  {signatureType === "type" ? (
                    <div>
                      <input
                        type="text"
                        placeholder="Type signature..."
                        value={typedSignature}
                        onChange={(e) => setTypedSignature(e.target.value)}
                        className="w-full px-3 py-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-serif italic text-lg tracking-wide"
                      />
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <div className="border border-slate-300 dark:border-slate-700 rounded-lg overflow-hidden bg-slate-50 dark:bg-slate-800">
                        <canvas
                          ref={canvasRef}
                          width={600}
                          height={120}
                          onMouseDown={startDrawing}
                          onMouseMove={draw}
                          onMouseUp={stopDrawing}
                          onMouseLeave={stopDrawing}
                          onTouchStart={startDrawing}
                          onTouchMove={draw}
                          onTouchEnd={stopDrawing}
                          className="w-full h-28 touch-none cursor-crosshair bg-white dark:bg-slate-800"
                        />
                      </div>
                      <button onClick={clearCanvas} className="text-[11px] text-slate-500 hover:text-rose-500">
                        Clear Canvas
                      </button>
                    </div>
                  )}
                </div>

                <label className="flex items-start gap-2 cursor-pointer pt-2">
                  <input
                    type="checkbox"
                    checked={hasConsented}
                    onChange={(e) => setHasConsented(e.target.checked)}
                    className="mt-0.5 rounded text-indigo-600"
                  />
                  <span className="text-[11px] text-slate-600 dark:text-slate-400">
                    I confirm that I am authorized to sign on behalf of {doc.clientName}, and I agree that this electronic signature is legally binding.
                  </span>
                </label>

                <button
                  disabled={!signerName || !hasConsented || signMutation.isPending}
                  onClick={() => signMutation.mutate()}
                  className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-sm shadow-md transition-colors flex items-center justify-center gap-2 mt-4"
                >
                  <Check size={16} />
                  {signMutation.isPending ? "Submitting Electronic Signature..." : "Sign & Accept Document"}
                </button>
              </div>
            ) : (
              <div className="mt-8 p-6 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-center space-y-3">
                <CheckCircle2 className="mx-auto text-emerald-600" size={36} />
                <h3 className="text-base font-bold text-emerald-900 dark:text-emerald-200">Document Successfully Signed!</h3>
                <p className="text-xs text-emerald-700 dark:text-emerald-300">
                  Thank you! Your Letter of Engagement has been verified and recorded with a full cryptographic audit certificate.
                </p>
                {auditCert && (
                  <div className="p-3 bg-white dark:bg-slate-900 rounded-lg text-left text-[11px] space-y-1 font-mono text-slate-600 dark:text-slate-400">
                    <p>Certificate: {auditCert.certificateId}</p>
                    <p>Signer: {auditCert.signerName}</p>
                    <p>Timestamp: {auditCert.signedTimestamp}</p>
                    <p>Checksum: {auditCert.documentChecksumSha256}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
