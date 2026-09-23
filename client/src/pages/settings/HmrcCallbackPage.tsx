import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { apiRequest } from "../../lib/queryClient";
import { Loader2, ShieldCheck, XCircle } from "lucide-react";

export default function HmrcCallbackPage() {
  const [, setLocation] = useLocation();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const processCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get("code");
      const error = urlParams.get("error");

      if (error) {
        setStatus("error");
        setErrorMessage(urlParams.get("error_description") || "Authorization was denied or failed.");
        return;
      }

      if (!code) {
        setStatus("error");
        setErrorMessage("No authorization code found in the callback URL.");
        return;
      }

      try {
        const res = await apiRequest("POST", "/api/hmrc-gateway/oauth/token", { code });
        if (res.ok) {
          setStatus("success");
          setTimeout(() => {
            setLocation("/self-assessment/settings");
          }, 3000);
        } else {
          const data = await res.json();
          setStatus("error");
          setErrorMessage(data.message || "Failed to exchange token with HMRC.");
        }
      } catch (err: any) {
        setStatus("error");
        setErrorMessage(err.message || "Network error while exchanging token.");
      }
    };

    processCallback();
  }, [setLocation]);

  return (
    <div className="flex h-screen w-full items-center justify-center bg-slate-50 dark:bg-slate-900">
      <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-xl max-w-md w-full text-center space-y-6">
        
        {status === "loading" && (
          <div className="flex flex-col items-center">
            <Loader2 size={48} className="text-indigo-600 animate-spin mb-4" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Connecting to HMRC</h2>
            <p className="text-sm text-slate-500 mt-2">
              Please wait while we establish a secure connection with Government Gateway...
            </p>
          </div>
        )}

        {status === "success" && (
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4">
              <ShieldCheck size={32} />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Connection Successful</h2>
            <p className="text-sm text-slate-500 mt-2">
              SanSuite is now authorized to interact with HMRC APIs on your behalf.
            </p>
            <p className="text-xs text-slate-400 mt-4">Redirecting back to settings...</p>
          </div>
        )}

        {status === "error" && (
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mb-4">
              <XCircle size={32} />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Connection Failed</h2>
            <p className="text-sm text-slate-500 mt-2">
              {errorMessage}
            </p>
            <button
              onClick={() => setLocation("/self-assessment/settings")}
              className="mt-6 px-6 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 text-sm font-medium"
            >
              Return to Settings
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
