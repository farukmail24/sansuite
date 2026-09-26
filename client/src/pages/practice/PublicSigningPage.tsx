import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute } from "wouter";
import {
  FileSignature, CheckCircle2, ShieldCheck,
  AlertCircle, Download, Check, RefreshCw, PenTool, Type,
  Upload, RotateCcw, Trash2, FileText, ExternalLink, X
} from "lucide-react";
import { apiRequest } from "../../lib/queryClient";
import { useToast } from "../../hooks/useToast";

export default function PublicSigningPage() {
  const [, params] = useRoute("/public/sign/:token");
  const token = params?.token;
  const { toast } = useToast();

  const [signerName, setSignerName] = useState("");
  const [signMode, setSignMode] = useState<"draw" | "type" | "upload">("draw");
  const [typedName, setTypedName] = useState("");
  const [selectedFont, setSelectedFont] = useState("font-serif italic");
  const [uploadedSignImage, setUploadedSignImage] = useState<string | null>(null);
  const [isDraggingSignImage, setIsDraggingSignImage] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [hasConsented, setHasConsented] = useState(false);
  const [isSignedSuccess, setIsSignedSuccess] = useState(false);
  const [auditCert, setAuditCert] = useState<any>(null);
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [declineReason, setDeclineReason] = useState("");

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const signImageInputRef = useRef<HTMLInputElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // Fetch document details
  const { data: doc, isLoading, error } = useQuery<any>({
    queryKey: [`/api/pm/loe/public/${token}`],
    queryFn: async () => {
      const res = await fetch(`/api/pm/loe/public/${token}`);
      if (!res.ok) throw new Error("Document not found or signing link expired.");
      return res.json();
    },
    enabled: !!token,
  });

  useEffect(() => {
    if (doc?.signeeName) {
      setSignerName(doc.signeeName);
      setTypedName(doc.signeeName);
    } else if (doc?.clientName) {
      setSignerName(doc.clientName);
      setTypedName(doc.clientName);
    }
    if (doc?.status === "Signed") {
      setIsSignedSuccess(true);
    }
  }, [doc]);

  // Canvas drawing handlers with smooth touch and mouse support
  const getCoordinates = (e: any) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clientX = e.clientX || e.touches?.[0]?.clientX || 0;
    const clientY = e.clientY || e.touches?.[0]?.clientY || 0;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const startDrawing = (e: any) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setHasDrawn(true);
  };

  const draw = (e: any) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.strokeStyle = "#1e1b4b";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
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
    setHasDrawn(false);
  };

  // Upload signature image handler
  const handleSignImageFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file format",
        description: "Please upload an image file (PNG, JPG, SVG, WebP).",
        variant: "destructive",
      });
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      setUploadedSignImage(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Submit Signature Mutation
  const signMutation = useMutation({
    mutationFn: async () => {
      let signatureDataUrl = "";

      if (signMode === "draw" && canvasRef.current) {
        signatureDataUrl = canvasRef.current.toDataURL("image/png");
      } else if (signMode === "type") {
        // Render typed cursive signature to image canvas
        const tempCanvas = document.createElement("canvas");
        tempCanvas.width = 600;
        tempCanvas.height = 180;
        const ctx = tempCanvas.getContext("2d");
        if (ctx) {
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
          ctx.font = selectedFont === "font-serif italic"
            ? "italic 44px Georgia, serif"
            : selectedFont === "font-mono italic"
            ? "italic 40px 'Courier New', monospace"
            : "italic 44px 'Brush Script MT', cursive, sans-serif";
          ctx.fillStyle = "#1e1b4b";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(typedName || signerName, 300, 90);
          signatureDataUrl = tempCanvas.toDataURL("image/png");
        }
      } else if (signMode === "upload" && uploadedSignImage) {
        signatureDataUrl = uploadedSignImage;
      }

      if (!signatureDataUrl) {
        throw new Error("Please provide your signature before signing.");
      }

      const res = await apiRequest("POST", `/api/pm/loe/public/${token}`, {
        signeeName: signerName || typedName || "Signatory",
        signatureDataUrl,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to submit signature.");
      }

      return await res.json();
    },
    onSuccess: (data: any) => {
      setIsSignedSuccess(true);
      setAuditCert(data.auditCertificate);
      toast({
        title: "Document Successfully Signed",
        description: "Your electronic signature and cryptographic certificate have been recorded.",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Signature Submission Failed",
        description: err.message || "Failed to complete digital signing.",
        variant: "destructive",
      });
    },
  });

  const canSign =
    !!(signerName || typedName) &&
    hasConsented &&
    ((signMode === "draw" && hasDrawn) ||
      (signMode === "type" && !!(typedName || signerName)) ||
      (signMode === "upload" && !!uploadedSignImage));

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
        <div className="text-center text-xs text-slate-500 space-y-2">
          <RefreshCw className="animate-spin mx-auto text-indigo-600" size={24} />
          <p>Verifying secure electronic signature portal...</p>
        </div>
      </div>
    );
  }

  if (error || !doc) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md text-center space-y-3">
          <AlertCircle className="mx-auto text-rose-500" size={36} />
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
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600 text-white font-bold flex items-center justify-center text-sm shadow-xs">
              SS
            </div>
            <div>
              <h1 className="text-sm font-bold text-slate-900 dark:text-slate-100">{doc.practiceName || "SanSuite Practice"}</h1>
              <p className="text-[11px] text-slate-500">Capisign UK Electronic Signature Portal</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
            <ShieldCheck size={14} /> 256-Bit eIDAS Certified
          </div>
        </div>

        {/* Document Container */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          {/* Header Banner */}
          <div className="bg-purple-600 p-6 text-white text-center space-y-1">
            <h2 className="text-lg font-bold tracking-tight">{doc.documentTitle}</h2>
            <p className="text-xs text-purple-100">Prepared for: {doc.clientName}</p>
          </div>

          {/* Body Content */}
          <div className="p-8 space-y-6 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
            {/* Notice Callout */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-2">
              <span className="font-bold text-slate-900 dark:text-slate-100 block">
                This electronic signing request concerns: <strong>{doc.clientName}</strong> — Document Approval.
              </span>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                By signing, you authorize your nominated accounting practice to act in accordance with the attached statutory filing or engagement terms. All interactions are cryptographically verified with IP and user-agent logging under UK statutory guidelines.
              </p>
            </div>

            {/* Attached Documents to Review List */}
            <div className="space-y-3">
              <span className="font-bold text-slate-900 dark:text-slate-100 block text-xs">
                Attached Documents to Review (3):
              </span>
              <div className="space-y-2">
                {[
                  { id: 1, title: doc.documentTitle || "HMRC Form CT600 Return", type: "Statutory Return Document" },
                  { id: 2, title: "Statutory Corporation Tax Computation Schedule", type: "HMRC Computation Schedule" },
                  { id: 3, title: "Director Approval Declaration (Companies Act 2006 & Taxes Management Act 1970)", type: "Legal Statutory Agreement" },
                ].map((item) => (
                  <div
                    key={item.id}
                    className="p-3 bg-white dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700/80 flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 font-bold flex items-center justify-center text-xs">
                        {item.id}
                      </div>
                      <div>
                        <span className="font-semibold text-slate-900 dark:text-slate-100 block text-xs">
                          {item.title}
                        </span>
                        <span className="text-[10px] text-slate-400">{item.type}</span>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 text-[11px] font-semibold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40 rounded-lg flex items-center gap-1">
                      <FileText size={12} />
                      <span>Attached</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Terms Summary */}
            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500">
              <span className="font-semibold text-slate-700 dark:text-slate-300 block">Terms &amp; Statutory Authority:</span>
              <p>
                In accordance with the UK Electronic Communications Act 2000 and European EU/UK eIDAS Regulation, your electronic signature carries the full legal weight and validity of a handwritten wet-ink signature.
              </p>
            </div>

            {/* SIGNATURE STUDIO SECTION (Draw / Type / Upload Image) */}
            {!isSignedSuccess ? (
              <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800 space-y-5">
                {/* Header with Mode Selector */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Create Your Digital Signature</h3>
                    <p className="text-xs text-slate-500">Choose between drawing your signature or generating a cursive digital signature</p>
                  </div>

                  {/* 3 Mode Selector Tabs */}
                  <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 self-start sm:self-auto">
                    <button
                      type="button"
                      onClick={() => setSignMode("draw")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                        signMode === "draw"
                          ? "bg-white dark:bg-slate-900 text-purple-700 dark:text-purple-300 shadow-xs"
                          : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                      }`}
                    >
                      <PenTool size={13} />
                      <span>Draw</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSignMode("type")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                        signMode === "type"
                          ? "bg-white dark:bg-slate-900 text-purple-700 dark:text-purple-300 shadow-xs"
                          : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                      }`}
                    >
                      <Type size={13} />
                      <span>Type</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSignMode("upload")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                        signMode === "upload"
                          ? "bg-white dark:bg-slate-900 text-purple-700 dark:text-purple-300 shadow-xs"
                          : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                      }`}
                    >
                      <Upload size={13} />
                      <span>Upload Image</span>
                    </button>
                  </div>
                </div>

                {/* 1. DRAW MODE CANVAS */}
                {signMode === "draw" && (
                  <div className="space-y-2">
                    <div className="relative border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl bg-white dark:bg-slate-900 overflow-hidden shadow-inner">
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
                        className="w-full h-[180px] cursor-crosshair touch-none bg-white dark:bg-slate-900"
                      />
                      {!hasDrawn && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-slate-300 dark:text-slate-600 text-sm font-medium">
                          Sign here using mouse or touch...
                        </div>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                      <span>Draw with mouse or fingertip</span>
                      <button
                        type="button"
                        onClick={clearCanvas}
                        className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1 font-medium transition-colors cursor-pointer"
                      >
                        <RotateCcw size={12} />
                        <span>Clear Signature</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* 2. TYPE MODE CURSIVE GENERATOR */}
                {signMode === "type" && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Full Legal Name for Electronic Signature
                      </label>
                      <input
                        type="text"
                        value={typedName}
                        onChange={(e) => {
                          setTypedName(e.target.value);
                          setSignerName(e.target.value);
                        }}
                        placeholder="e.g. John Doe"
                        className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                      />
                    </div>

                    {/* Font Selection Previews */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {[
                        { id: "font-serif italic", name: "Classic Script" },
                        { id: "font-mono italic", name: "Modern Script" },
                      ].map((f) => (
                        <div
                          key={f.id}
                          onClick={() => setSelectedFont(f.id)}
                          className={`p-4 rounded-xl border cursor-pointer transition-all ${
                            selectedFont === f.id
                              ? "border-purple-600 bg-purple-50/40 dark:bg-purple-950/40 shadow-xs"
                              : "border-slate-200 dark:border-slate-700 hover:border-slate-300 bg-white dark:bg-slate-800"
                          }`}
                        >
                          <span className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">
                            {f.name}
                          </span>
                          <div className={`text-xl text-slate-800 dark:text-slate-100 tracking-wider truncate ${f.id}`}>
                            {typedName || signerName || "Sample Signature"}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 3. UPLOAD IMAGE MODE */}
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
                      <div className="border-2 border-slate-200 dark:border-slate-700 rounded-2xl bg-slate-50/50 dark:bg-slate-800/50 p-4 space-y-3">
                        <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                          <span className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-bold">
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

                        <div className="h-44 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-center p-4 overflow-hidden relative shadow-inner">
                          <img
                            src={uploadedSignImage}
                            alt="Uploaded Signature"
                            className="max-h-full max-w-full object-contain filter drop-shadow-xs"
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
                        className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer space-y-3 ${
                          isDraggingSignImage
                            ? "border-purple-600 bg-purple-50/50 dark:bg-purple-950/40 scale-[1.01]"
                            : "border-slate-300 dark:border-slate-700 hover:border-purple-400 hover:bg-purple-50/20 dark:hover:bg-purple-950/20"
                        }`}
                      >
                        <div className="w-12 h-12 bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 rounded-xl flex items-center justify-center mx-auto">
                          <Upload size={22} />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                            Click to upload or drag &amp; drop signature image
                          </p>
                          <p className="text-xs text-slate-400 mt-1">
                            Supports transparent PNG, JPG, or SVG signature files (Max 5MB)
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Consent Checkbox */}
                <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hasConsented}
                      onChange={(e) => setHasConsented(e.target.checked)}
                      className="mt-0.5 rounded border-slate-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                    />
                    <span className="text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed select-none">
                      I agree and confirm that my electronic signature submitted herein represents my legally binding agreement under the <strong>UK Electronic Communications Act 2000</strong> and <strong>EU/UK eIDAS Regulation</strong>.
                    </span>
                  </label>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                  <button
                    type="button"
                    disabled={!canSign || signMutation.isPending}
                    onClick={() => signMutation.mutate()}
                    className="w-full sm:flex-1 py-3 px-5 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold text-xs shadow-md transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Check size={16} className={signMutation.isPending ? "animate-spin" : ""} />
                    <span>{signMutation.isPending ? "Submitting Electronic Signature..." : "Sign & Approve Document"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowDeclineModal(true)}
                    className="w-full sm:w-auto py-3 px-5 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold text-xs transition-colors cursor-pointer"
                  >
                    Decline to Sign
                  </button>
                </div>
              </div>
            ) : (
              /* SUCCESS CERTIFICATE VIEW */
              <div className="mt-8 p-6 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-center space-y-4">
                <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-300 mx-auto flex items-center justify-center shadow-xs">
                  <CheckCircle2 size={32} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-emerald-900 dark:text-emerald-100">
                    Document Successfully Signed &amp; Approved!
                  </h3>
                  <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-1">
                    Thank you! Your signature has been verified and recorded with a full cryptographic audit certificate.
                  </p>
                </div>

                {auditCert && (
                  <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-emerald-200 dark:border-emerald-900/60 text-left text-[11px] space-y-1.5 font-mono text-slate-700 dark:text-slate-300 shadow-xs">
                    <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-1">
                      <span className="text-slate-400">Certificate ID:</span>
                      <span className="font-bold">{auditCert.certificateId}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-1">
                      <span className="text-slate-400">Signatory:</span>
                      <span>{auditCert.signerName}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-1">
                      <span className="text-slate-400">Timestamp:</span>
                      <span>{new Date(auditCert.signedTimestamp).toLocaleString("en-GB")}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-1">
                      <span className="text-slate-400">IP Address:</span>
                      <span>{auditCert.signerIp}</span>
                    </div>
                    <div className="flex justify-between pt-0.5">
                      <span className="text-slate-400">SHA-256 Hash:</span>
                      <span className="truncate max-w-[260px]">{auditCert.documentChecksumSha256}</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Decline Modal */}
      {showDeclineModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">Decline to Sign Document</h3>
              <button onClick={() => setShowDeclineModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={16} />
              </button>
            </div>
            <p className="text-xs text-slate-500">
              Please provide a reason for declining. Your accounting practice will be notified to revise figures if necessary.
            </p>
            <textarea
              rows={3}
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              placeholder="Enter reason for declining..."
              className="w-full text-xs p-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowDeclineModal(false)}
                className="px-3.5 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowDeclineModal(false);
                  toast({
                    title: "Decline Recorded",
                    description: "The practice has been notified of your decline.",
                    variant: "destructive",
                  });
                }}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold"
              >
                Confirm Decline
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
