import React, { useState, useEffect } from "react";
import {
  FileText, Send, CheckCircle2, Lock, KeyRound, Copy,
  Check, X, ExternalLink, ShieldCheck, Mail
} from "lucide-react";
import { apiRequest } from "../../lib/queryClient";
import { useToast } from "../../hooks/useToast";
import { useQueryClient } from "@tanstack/react-query";

interface SendToeSignModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTitle: string;
  sourceModule: "Accounts Production" | "Corporation Tax" | "Self Assessment" | "Practice Management" | "Bookkeeping";
  clientId?: number;
  clientName?: string;
  clientEmail?: string;
}

export default function SendToeSignModal({
  open,
  onOpenChange,
  defaultTitle,
  sourceModule,
  clientId,
  clientName = "",
  clientEmail = "",
}: SendToeSignModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState(defaultTitle);
  const [signerName, setSignerName] = useState(clientName);
  const [signerEmail, setSignerEmail] = useState(clientEmail);
  const [signerRole, setSignerRole] = useState("Signer");
  const [isPasswordProtected, setIsPasswordProtected] = useState(false);
  const [accessCode, setAccessCode] = useState("");
  const [message, setMessage] = useState(
    "Please review and electronically sign this official statutory document prepared by your accounting team."
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdResult, setCreatedResult] = useState<{
    id: number;
    primarySigningUrl: string | null;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (open) {
      setTitle(defaultTitle);
      setSignerName(clientName);
      setSignerEmail(clientEmail);
      setCreatedResult(null);
      setCopied(false);
    }
  }, [open, defaultTitle, clientName, clientEmail]);

  if (!open) return null;

  const handleDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !signerEmail.trim()) {
      toast({
        title: "Validation Error",
        description: "Title and signatory email are required.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        title: title.trim(),
        sourceModule,
        clientId: clientId || null,
        message: message.trim(),
        isPasswordProtected,
        accessCode: isPasswordProtected ? accessCode.trim() : null,
        signers: [
          {
            signerName: signerName.trim() || "Client Signer",
            signerEmail: signerEmail.trim(),
            signerRole,
          },
        ],
      };

      const res = await apiRequest("POST", "/api/esign/documents", payload);
      if (!res.ok) throw new Error("Failed to dispatch document");
      const data = await res.json();

      queryClient.invalidateQueries({ queryKey: ["/api/esign/documents"] });
      setCreatedResult(data);

      toast({
        title: "eSign Document Dispatched",
        description: `Signature request successfully dispatched to ${signerEmail}.`,
      });
    } catch (err: any) {
      toast({
        title: "Dispatch Failed",
        description: err.message || "Failed to create e-signature request.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopy = (url: string) => {
    const full = url.startsWith("http") ? url : `${window.location.origin}${url}`;
    navigator.clipboard.writeText(full);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Copied", description: "Client signing link copied to clipboard." });
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <FileText size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">Send to eSign (E-Signature)</h3>
              <span className="text-[11px] bg-purple-50 text-purple-700 px-2 py-0.5 rounded font-semibold">
                {sourceModule}
              </span>
            </div>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="text-slate-400 hover:text-slate-600 cursor-pointer p-1 rounded-md"
          >
            <X size={16} />
          </button>
        </div>

        {/* Success State */}
        {createdResult ? (
          <div className="space-y-4 py-2">
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center space-y-2">
              <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 size={20} />
              </div>
              <h4 className="text-sm font-bold text-emerald-900">E-Signature Request Dispatched!</h4>
              <p className="text-xs text-emerald-700">
                Document has been registered and an automated invitation email has been dispatched to{" "}
                <strong>{signerEmail}</strong>.
              </p>
            </div>

            {createdResult.primarySigningUrl && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                  Direct Signing Link
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={`${window.location.origin}${createdResult.primarySigningUrl}`}
                    className="w-full text-xs px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-700 font-mono select-all outline-none"
                  />
                  <button
                    onClick={() => handleCopy(createdResult.primarySigningUrl!)}
                    className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold shrink-0 flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    {copied ? <Check size={13} /> : <Copy size={13} />}
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <a
                href="/esign"
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <ExternalLink size={13} /> Open eSign Dashboard
              </a>
              <button
                onClick={() => onOpenChange(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          /* Dispatch Form */
          <form onSubmit={handleDispatch} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Document Title *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:bg-white focus:ring-1 focus:ring-purple-500 outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Signatory Name
                </label>
                <input
                  type="text"
                  value={signerName}
                  onChange={(e) => setSignerName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:bg-white focus:ring-1 focus:ring-purple-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Signatory Email *
                </label>
                <input
                  type="email"
                  required
                  value={signerEmail}
                  onChange={(e) => setSignerEmail(e.target.value)}
                  placeholder="client@example.com"
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:bg-white focus:ring-1 focus:ring-purple-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Signatory Role
              </label>
              <select
                value={signerRole}
                onChange={(e) => setSignerRole(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:bg-white focus:ring-1 focus:ring-purple-500 outline-none"
              >
                <option value="Director">Director (Accounts / Tax Approval)</option>
                <option value="Client">Individual Client</option>
                <option value="Partner">Designated Partner (LLP)</option>
                <option value="Trustee">Trustee / Authorised Officer</option>
                <option value="Signer">General Signer</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Message to Signer
              </label>
              <textarea
                rows={2}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:bg-white focus:ring-1 focus:ring-purple-500 outline-none resize-none"
              />
            </div>

            {/* Password Protection Toggle */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Lock size={14} className="text-purple-600" />
                  <span className="text-xs font-bold text-slate-800">Password / Access Code Protection</span>
                </div>
                <input
                  type="checkbox"
                  checked={isPasswordProtected}
                  onChange={(e) => setIsPasswordProtected(e.target.checked)}
                  className="w-4 h-4 text-purple-600 rounded"
                />
              </div>
              {isPasswordProtected && (
                <div className="pt-2">
                  <input
                    type="text"
                    required={isPasswordProtected}
                    placeholder="Enter security access code for client..."
                    value={accessCode}
                    onChange={(e) => setAccessCode(e.target.value)}
                    className="w-full text-xs px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-mono outline-none focus:ring-1 focus:ring-purple-500"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    The client must enter this code before opening and executing the document.
                  </span>
                </div>
              )}
            </div>

            {/* Footer Buttons */}
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors shadow-xs"
              >
                {isSubmitting ? (
                  <>
                    <CheckCircle2 size={13} className="animate-spin" /> Dispatching...
                  </>
                ) : (
                  <>
                    <Send size={13} /> Dispatch to eSign
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// Export alias for seamless backward-compatibility
export { SendToeSignModal as SendToSanSignModal };
