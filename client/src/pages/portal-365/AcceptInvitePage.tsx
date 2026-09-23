import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { Shield, KeyRound, CheckCircle2, AlertCircle } from "lucide-react";

export default function AcceptInvitePage() {
  const [match, params] = useRoute("/portal/accept/:token");
  const token = match ? params.token : "";
  const [, navigate] = useLocation();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const [targetPortal, setTargetPortal] = useState<"365" | "sme">("365");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters long");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/portal/accept-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to accept invitation");
      }

      const data = await res.json();
      if (data.token) {
        localStorage.setItem("token", data.token);
      }
      if (data.user) {
        localStorage.setItem("user", JSON.stringify(data.user));
      }
      setTargetPortal(data.portalType || "365");
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "Failed to activate client portal account");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white border border-gray-200 rounded-2xl shadow-lg max-w-md w-full p-8 space-y-6">
        <div className="text-center">
          <div className="w-12 h-12 bg-purple-100 text-purple-700 rounded-xl flex items-center justify-center mx-auto mb-4">
            <Shield size={24} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Activate Client Portal</h1>
          <p className="text-xs text-gray-500 mt-1">Set up your secure password to access your company portal</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 p-3 rounded-xl text-xs flex items-center gap-2 border border-red-200">
            <AlertCircle size={16} /> {error}
          </div>
        )}

        {success ? (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center space-y-3">
            <CheckCircle2 size={36} className="text-emerald-600 mx-auto" />
            <h3 className="text-lg font-bold text-emerald-900">Account Successfully Activated!</h3>
            <p className="text-xs text-emerald-700">
              Your credentials are set. You are now authorized to access your live financial portal.
            </p>
            <button
              onClick={() => {
                window.location.href = targetPortal === "sme" ? "/sme/dashboard" : "/portal/workspace";
              }}
              className="mt-4 w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm"
            >
              Enter {targetPortal === "sme" ? "Client & SME Workspace" : "Client Portal 365 Workspace"}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">New Password</label>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                />
                <KeyRound className="absolute right-3 top-3 text-gray-400" size={16} />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">Confirm Password</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2.5 rounded-lg font-semibold text-sm shadow-sm transition-colors disabled:opacity-50"
            >
              {submitting ? "Activating..." : "Activate Account & Login"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
