import { useState, useEffect } from "react";
import { useRoute } from "wouter";
import { FileText, CheckCircle2, ShieldCheck, PenTool, AlertCircle } from "lucide-react";

export default function PublicSignPage() {
  const [match, params] = useRoute("/sansign/public/:token");
  const token = match ? params.token : "";

  const [documentData, setDocumentData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [signed, setSigned] = useState(false);
  const [signing, setSigning] = useState(false);
  const [signatureText, setSignatureText] = useState("");

  useEffect(() => {
    if (!token) return;
    fetch(`/api/sansign/public/documents/${token}`)
      .then((res) => {
        if (!res.ok) throw new Error("Document not found or invalid signature token");
        return res.json();
      })
      .then((data) => {
        setDocumentData(data);
        if (data.status === "Signed") setSigned(true);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [token]);

  const handleSign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signatureText.trim()) return;

    setSigning(true);
    try {
      const res = await fetch(`/api/sansign/public/documents/${token}/sign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signatureData: signatureText }),
      });

      if (!res.ok) throw new Error("Failed to submit signature");
      
      setSigned(true);
    } catch (err: any) {
      setError(err.message || "Failed to submit signature");
    } finally {
      setSigning(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-gray-500 flex items-center gap-2">
          <div className="w-5 h-5 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
          Loading document details...
        </div>
      </div>
    );
  }

  if (error || !documentData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-xl shadow-sm max-w-md w-full text-center border border-gray-200">
          <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={24} />
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Invalid Signature Request</h2>
          <p className="text-gray-500 text-sm">{error || "This document link is invalid or has expired."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 flex justify-center">
      <div className="max-w-2xl w-full space-y-6">
        {/* Header */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 text-purple-700 rounded-lg flex items-center justify-center font-bold text-lg">
              S
            </div>
            <div>
              <h1 className="font-bold text-gray-900">SanSign Digital Signature Portal</h1>
              <p className="text-xs text-gray-500 flex items-center gap-1">
                <ShieldCheck size={14} className="text-green-600" /> Secure 256-bit Encrypted Signature Verification
              </p>
            </div>
          </div>
        </div>

        {/* Main Document Details & Signature Box */}
        <div className="bg-white border border-gray-200 rounded-xl p-8 shadow-sm space-y-6">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-purple-50 text-purple-700 rounded-md text-xs font-semibold mb-3">
              <FileText size={14} /> {documentData.sourceModule || "Accounting Document"}
            </div>
            <h2 className="text-2xl font-bold text-gray-800">{documentData.title}</h2>
            <p className="text-sm text-gray-500 mt-1">
              Signer: <span className="font-medium text-gray-700">{documentData.signerName || documentData.signerEmail || "Client Signer"}</span>
            </p>
          </div>

          <div className="border-t border-b border-gray-100 py-6 my-6 bg-gray-50/50 p-6 rounded-lg">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Legal Confirmation Statement</p>
            <p className="text-sm text-gray-600 leading-relaxed">
              By typing your full name below and clicking "Sign Document", you confirm that you have read, understood, and agree to the contents of this document. Your digital signature carries full legal weight under EU/UK eIDAS regulations.
            </p>
          </div>

          {signed ? (
            <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center space-y-2">
              <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 size={24} />
              </div>
              <h3 className="text-lg font-bold text-green-800">Document Signed Successfully!</h3>
              <p className="text-xs text-green-700">A confirmation audit log has been sent to your accounting firm.</p>
            </div>
          ) : (
            <form onSubmit={handleSign} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type your full name to generate digital signature
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={signatureText}
                    onChange={(e) => setSignatureText(e.target.value)}
                    placeholder="e.g. John Doe"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-lg font-serif italic focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                  />
                  <PenTool className="absolute right-3 top-3.5 text-gray-400" size={20} />
                </div>
              </div>

              <button
                type="submit"
                disabled={signing || !signatureText.trim()}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-lg font-semibold shadow-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {signing ? (
                  <>Signing Document...</>
                ) : (
                  <>
                    <PenTool size={18} /> Sign Document Now
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
